require('dotenv').config(); // to load the environment variables

const { App, LogLevel } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret from environment variables
const slackApp = new App({  // renamed to slackApp
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG, // Set to a desired log level (optional)
});

// Event listener for app home opened event
slackApp.event('app_home_opened', async ({ event, client, logger }) => {
    // Push a view to the Home tab
    await client.views.publish({
      // the user that opened your app's app home
      user_id: event.user,
      // the view object that appears in the app home
      view: {
        type: 'home',
        callback_id: 'home_view',
        // body of the view
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
              },
            ],
          },
        ],
      },
    });
});


// Function to get user info from user_id
async function getUserInfo(client, userId) {
  let retries = 0;
  const maxRetries = 5; // maximum number of retries
  while (retries < maxRetries) {
    try {
      const response = await client.users.info({ user: userId });
      if (response.ok) {
        return response.user;
      } else {
        return null;
      }
    } catch (error) {
      logger.error('error in getuserinfo function')
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
  
  // Message event listener for "hi" command
slackApp.message('hi', async ({ message, say, client }) => {
  const user = await getUserInfo(client, message.user);
  const fullName = user && user.profile.real_name;
  say({
    text: `Hello, ${fullName}!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hello, ${fullName}!`,
        },
      },
    ],
  });
  say({
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
              text: 'Approve',
            },
            value: "click_me_123",
            action_id: 'Chase Approval'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Create SoW',
            },
            value: "click_me456",
            action_id: 'Create SoW'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Drink a Beer',
            },
            action_id: 'Drink',
          },
        ],
      },
    ],
  });
});

  
// Action listener for "Create SoW" button click
slackApp.action('Create SoW', async ({ ack, body, respond }) => {
  try {
    await ack(); // Acknowledge the action

    // Prevent multiple clicks
    if (body.message.thread_ts) {
      // If the message has a thread timestamp, it means it is a threaded reply
      return; // Exit the action listener
    }

    // Update the original message with a new text and blocks
    await respond({
      text: "Cool, Let's create a new statement of work (SoW)",
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Who are we doing this for?`,
          },
        },
      ],
      replace_original: true,
    });
  } catch (error) {
    logger.error(`Error in 'Create SoW' action: ${error.message} Stack: ${error.stack}`);
  }
});

slackApp.action('Drink', async ({ ack, respond, body }) => {
  try {
    await ack(); // Acknowledge the action

    // Prevent multiple clicks
    if (body.message.thread_ts) {
      // If the message has a thread timestamp, it means it is a threaded reply
      return; // Exit the action listener
    }

    // Update the original message with a new text
    await respond({
      text: 'Enjoy your beer!',
      replace_original: true,
    });
  } catch (error) {
    logger.error(`Error in 'Drink' action: ${error.message} Stack: ${error.stack}`);
  }
});

// Action listener for "Chase Approval" button click
slackApp.action('Chase Approval', async ({ ack, respond, body }) => {
  try {
    await ack(); // Acknowledge the action

    // Prevent multiple clicks
    if (body.message.thread_ts) {
      // If the message has a thread timestamp, it means it is a threaded reply
      return; // Exit the action listener
    }

    // Update the original message with a new text
    await respond({
      text: "Let's get that document approved!",
      replace_original: true,
    });
  } catch (error) {
    logger.error(`Error in 'Chase Approval' action: ${error.message} Stack: ${error.stack}`);
  }
});

// Start your app
(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
