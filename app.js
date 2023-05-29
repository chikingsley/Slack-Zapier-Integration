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
  const greetingMessage = {
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
  };
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
              text: 'Approve',
            },
            value: 'click_me_123',
            action_id: 'Approve',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Create SoW',
            },
            value: 'click_me456',
            action_id: 'Create SoW',
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
  };

  const { body, respond } = say(greetingMessage); // Store the response and message ID
  const messageId = body.message.ts; // Get the message ID

  const buttonMessageResponse = await say(buttonMessage); // Send the button message and store the response

  const originalButtonBlocks = buttonMessageResponse.message.blocks[2].elements; // Get the original button blocks

  // Action listener for buttons
  slackApp.action(['Approve', 'Create SoW', 'Drink'], async ({ body, respond }) => {
    const clickedActionId = body.actions[0].action_id; // Get the clicked action ID

    const updatedButtonBlocks = originalButtonBlocks.map(button => {
      if (button.action_id === clickedActionId) {
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `You clicked "${button.text.text}"`,
          },
        };
      }
      return button;
    });

    await respond({
      text: 'Updated message',
      blocks: [
        greetingMessage,
        buttonMessage.blocks[0],
        buttonMessage.blocks[1],
        {
          type: 'actions',
          elements: updatedButtonBlocks,
        },
      ],
      replace_original: true, // Replace only the button section
    });
  });


// Start your app
(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
