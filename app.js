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

slackApp.action('Create SoW', async ({ ack, body, client, respond }) => {
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

  // Open the modal
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'sow_modal',
        title: {
          type: 'plain_text',
          text: 'Create SoW'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'company_name_block',
            label: {
              type: 'plain_text',
              text: 'Company Name or POC',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'company_name_input'
            }
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        }
      }
    });
  } catch (error) {
    console.error(`Error in 'Create SoW' action: ${error.message} Stack: ${error.stack}`);
  }
});

slackApp.command('/delete', async ({ command, ack, client }) => {
  ack(); // Acknowledge the command immediately

  try {
    const channelId = command.channel_id;
    const result = await client.conversations.history({
      channel: channelId,
    });
    const messages = result.messages;

    // Delete each message asynchronously
    messages.forEach(async (message) => {
      try {
        await client.chat.delete({
          channel: channelId,
          ts: message.ts,
        });
      } catch (error) {
        console.error(`Error deleting message: ${error}`);
      }
    });

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
