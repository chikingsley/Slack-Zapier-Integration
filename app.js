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
    
  // Object used to create a message that greets the user with their full name
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

  const { body: greetingResponse } = greetingMessage; // Store the response of the greeting message
  const greetingMessageId = greetingResponse.message.ts; // Get the message ID of the greeting message

  const { body: buttonResponse } = buttonMessage; // Store the response of the button message
  const buttonMessageId = buttonResponse.message.ts; // Get the message ID of the button message
    
  slackApp.action('Create SoW', async ({ ack, body, respond, say }) => {
    try {
      await ack(); // Acknowledge the action

      // Prompt the user for the company name
      await say({
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

  // Listen for user's response to the company name prompt
  slackApp.action('company_name_input', async ({ ack, body, respond, say }) => {
    try {
      await ack(); // Acknowledge the action

      const companyName = body.actions[0].value; // Get the company name entered by the user

      // Send the initial message to indicate checking the database
      await say("Checking the database for:");

      // Send the second message with the company name
      await say(`- ${companyName}`);
    } catch (error) {
      logger.error(`Error in 'company_name_input' action: ${error.message} Stack: ${error.stack}`);
    }
  });
  
    // Delete original messages after a certain duration
    setTimeout(async () => {
      await Promise.all([
        client.chat.delete({
          channel: message.channel,
          ts: greetingMessageId,
        }),
        client.chat.delete({
          channel: message.channel,
          ts: buttonMessageId,
        }),
      ]);
    }, 5000);
  });

// Start your app
(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
