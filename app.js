require('dotenv').config();

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

slackApp.action('Create SoW', async ({ ack, body, respond, logger }) => {
  try {
    await ack();
    await respond({
      text: "Please provide the name of the company we're doing this project for:",
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Please provide the name of the company we\'re doing this project for:',
          },
          accessory: {
            type: 'plain_text_input',
            action_id: 'company_name_input',
            placeholder: {
              type: 'plain_text',
              text: 'Company name',
            },
          },
        },
      ],
    });
  } catch (error) {
    logger.error(`Error in 'Create SoW' action: ${error.message} Stack: ${error.stack}`);
  }
});

slackApp.action('company_name_input', async ({ ack, body, respond, logger }) => {
  try {
    await ack();
    const companyName = body.actions[0].value;
    await respond("Checking the database for:");
    await respond(`- ${companyName}`);
  } catch (error) {
    logger.error(`Error in 'company_name_input' action: ${error.message} Stack: ${error.stack}`);
  }
});

slackApp.command('/delete', async ({ command, client }) => {
  try {
    const channelId = command.channel_id;
    const result = await client.conversations.history({
      channel: channelId,
    });
    const messages = result.messages;
    for (const message of messages) {
      await client.chat.delete({
        channel: channelId,
        ts: message.ts,
      });
    }
    await client.chat.postMessage({
      channel: channelId,
      text: 'Chat history deleted.',
    });
  } catch (error) {
    console.error('Error deleting chat history:', error);
  }
});

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
