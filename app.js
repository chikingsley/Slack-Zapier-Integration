require('dotenv').config();
const axios = require('axios');
const { App, LogLevel } = require('@slack/bolt');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

slackApp.command('/delete', async ({ command, ack, client }) => {
  try {
    await ack();
    const deleteResult = await client.chat.delete({
      channel: command.channel_id,
      ts: command.ts,
    });
    console.log('Message deleted:', deleteResult);
  } catch (error) {
    console.error('Error deleting message:', error);
  }
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
            text: "Click the button below to open the modal.",
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Open Modal',
              },
              action_id: 'open_modal_button',
            },
          ],
        },
      ],
    },
  });
});

slackApp.action('open_modal_button', async ({ ack, body, client, respond }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      title: {
        type: 'plain_text',
        text: 'Sample Modal',
      },
      close: {
        type: 'plain_text',
        text: 'Close',
      },
      submit: {
        type: "plain_text",
        text: "Submit"
      },
      blocks: [
        {
          type: 'input',
          label: {
            type: 'plain_text',
            text: 'Label'
          },
          element: {
            type: 'plain_text_input',
            action_id: 'company_name_input',
          },
        }
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
  await say(greetingMessage);
  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "It's good to see you 😇. What do you want to do today?",
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
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
            action_id: 'Create_SoW',
          },
        ],
      },
    ],
  });
});

slackApp.action('Create_SoW', async ({ ack, body, client, respond }) => {
  await ack();
  // Disable the button and replace it with a message
  await respond({
    replace_original: true,
    text: "Processing...",
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Processing..."
        }
      }
    ]
  });
  // Ask the user to make a Statement of Work (SoW)
  await respond({
    text: "Okay - let's make a Statement of Work (SoW)!!",
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Okay - let's make a Statement of Work (SoW)!!",
        }
      }
    ]
  });
  // Ask the user for the company name or POC using blocks
  await respond({
    text: "Who are we doing this project for? Respond with a company name or the name of the point of contact (POC).",
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Who are we doing this project for? Respond with a company name or the name of the point of contact (POC).",
        }
      }
    ]
  });
  console.log('Attempting to open modal with trigger_id', body.trigger_id);
  // Open the modal
 await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'sow_modal',
      title: {
        type: 'plain_text',
        text: 'Create a Statement of Work',
      },
      blocks: [
        {
          block_id: 'company_name_block',
          type: 'input',
          label: {
            type: 'mrkdwn',
            text: 'Company name',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'company_name_input',
          },
        },
      ],
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
      private_metadata: JSON.stringify({ userId: body.user.id, channelId: body.channel.id }),
    },
  });
  console.log('Successfully opened modal with trigger_id', body.trigger_id);
});


slackApp.view('sow_modal', async ({ ack, body, view, client }) => {
  await ack();

  const user_input = view.state.values.company_name_block.company_name_input.value;
  const { userId, channelId } = JSON.parse(view.private_metadata);

  await client.chat.postMessage({
    channel: channelId,
    text: `The submitted value is: ${user_input}`,
  });
  axios.post('https://hooks.zapier.com/hooks/catch/15387298/3tmuyca', {
    user_input: user_input
  });
});

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
