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
  try {
    // Push a view to the Home tab
    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        callback_id: 'home_view',
        blocks: [
          // ... your blocks
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Click me!',
                },
                action_id: 'button_click', // added action_id
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    logger.error(`Error publishing home tab: ${error}`);
  }
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
    try {
      const user = await getUserInfo(client, message.user);
      if (user) {
        const fullName = userInfo.profile.real_name;
        say({
          text: `Hello, ${fullName}!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Hello, *${user.real_name}*!`,
              },
            },
          ],
        });
      } else {
        say('Hello!');
      }
  
      say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'plain_text',
              text: "Hey, what's up? Good to see you 😇. What do you want to do today?",
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
    } catch (error) {
      console.error(error);
    }
  });
  
// Action listener for "Create SoW" button click
slackApp.action('Create SoW', async ({ ack, body, say }) => { // fixed action_id
  try {
    // Acknowledge the action
    await ack();
    // Say something in response
    await say("Cool, Let's create a new statement of work (SoW)");
  }catch (error) {
      console.error(error);
    }
    say({
          text: `Who are we doing this for?`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Which company are we doing this for?`,
              },
            },
          ],
        });
});

// Action listener for "Drink" button click
slackApp.action('Drink', async ({ ack, say }) => { // fixed action_id
  try {
    // Acknowledge the action
    await ack();
    // Say something in response
    await say('Enjoy your beer!');
  } catch (error) {
    console.error(error);
  }
});

// Action listener for "Chase Approval" button click
slackApp.action('Chase Approval', async ({ ack, say }) => { // fixed action_id
    try {
        // Acknowledge the action
        await ack();
    // Say something in response
    await say("Let's get that document approved!");
  } catch (error) {
    console.error(error);
  }
});

// Start your app
(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
