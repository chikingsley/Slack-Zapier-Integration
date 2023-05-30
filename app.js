require('dotenv').config();
const axios = require('axios');
const { App, LogLevel } = require('@slack/bolt');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

slackApp.event('app_home_opened', async ({ event, client }) => {
  await client.views.publish({
    user_id: event.user,
    view: {
      type: 'home',
      callback_id: 'home_view',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Welcome to your _App\'s Home_* :tada:',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: "This button won't do much for now but you can set up a listener for it using the `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app.",
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Click me!',
              },
              action_id: 'click_me',
            },
          ],
        },
      ],
    },
  });
});

async function getUserInfo(client, userId) {
  let retries = 0;
  const maxRetries = 5;
  while (retries < maxRetries) {
    try {
      const response = await client.users.info({ user: userId });
      if (response.ok) {
        return response.user;
      } else {
        return null;
      }
    } catch (error) {
      if (error.response.headers['retry-after']) {
        await new Promise((resolve) =>
          setTimeout(resolve, parseInt(error.response.headers['retry-after']) * 1000)
        );
      } else {
        throw error;
      }
    }
    retries++;
  }
  throw new Error('Maximum retry attempts exceeded');
}

slackApp.message('hi', async ({ message, say, client }) => {
  const user = await getUserInfo(client, message.user);
  const fullName = user && user.profile.real_name;
    
  const greetingMessage = `Hello, ${fullName}!`;

  const buttonMessage = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: "It's good to see you 😇. What do you want to do today?",
        },
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'Pick one⬇️',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Create SoW',
            },
            value: "click_me456",
            action_id: 'Create SoW'
          },
        ],
      },
    ],
  };

  say(greetingMessage);
  say(buttonMessage);
});

slackApp.action('Create SoW', async ({ ack, body, client }) => {
  await ack();

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'sow_modal',
      private_metadata: JSON.stringify({ userId: body.user.id, channelId: body.channel.id }),
      title: {
        type: 'plain_text',
        text: 'Create a Statement of Work',
      },
      blocks: [
        {
          block_id: 'company_name_block',
          type: 'input',
          label: {
            type: 'plain_text',
            text: 'Company name',
          },
          element: {
            action_id: 'company_name_input',
            type: 'plain_text_input',
          },
        },
      ],
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
    },
  });
});

slackApp.view('sow_modal', async ({ ack, body, view, client }) => {
  await ack();

  const user_input = view.state.values.company_name_block.company_name_input.value;
  const { userId, channelId } = JSON.parse(view.private_metadata);

  await client.chat.postMessage({
    channel: channelId,
    text: `The submitted value is: ${user_input}`,
  });

  // Save user_input somewhere
  // Send it to a Zapier webhook
  axios.post('https://hooks.zapier.com/hooks/catch/15387298/3tmuyca', {
    user_input: user_input
  });
});

slackApp.command('/delete', async ({ command, ack, client }) => {
  await ack();

  const result = await client.chat.delete({
    channel: command.channel_id,
    ts: command.ts,
  });
});

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
