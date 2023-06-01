require('dotenv').config();
const axios = require('axios');
const { App, LogLevel, contextBuiltinKeys } = require('@slack/bolt');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

async function getUserInfo(client, userId) {
  console.log(client);  // Add this line
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

//basic listener that publishes a view to the home tab where app lives
slackApp.event('app_home_opened', async ({ event, client, context }) => {
  try {
  // view.publish is the method that the app uses to push a view to the home tab
    await client.views.publish({
      // the user that opened your app's app home
      user_id: event.user,
      // the view object taht appears in teh app home
      view: {
        type: 'home',
        callback_id: 'home_view',
        //the body of the view
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
  }
  catch (error) {
    console.error(error);
  }
});

slackApp.action('open_modal_button', async ({ ack, body, client, respond }) => {
  await ack();

  //open modal to get user feedback
  try {
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
  }
  catch(error) {
    console.error(error);
  }
})

slackApp.message('sow', async ({ message, say, client }) => {
  const user = await getUserInfo(client, message.user);
  const fullName = user && user.profile.real_name;
  
  try {
    // respond hello with user's full name - ask what they want to do -> pick one
    await respond({
      text: `Hello, ${fullName}!\n It's good to see you 😇. What do you want to do today?`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hello, ${fullName}!\n It's good to see you 😇. What do you want to do today?`,
          },
        },
      ],
    });
    // tell user to pick an option
    await respond({
      text: `Pick one⬇️`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Pick one⬇️`,
          },
        },
      ],
    });
    // button option encoded in blocks
    const options = [
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
    ];
    await say({ options });
  }
  catch (error) {
    console.error(error);
  }
});

//makes modal to ger user input to make sow
slackApp.action('Create_SoW', async ({ ack, body, client, respond, say, context }) => {
  // acknowledge the button request
  await ack();
  try {
    // update the button message
    const result = await slackApp.client.chat.update({
      token: context.botToken,
      // ts of message to update
      ts: body.message_ts,
      // Channel to send message to
      channel: body.channel.id,
      // Message
      //replace_original: true,
      text: "Processing...",
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Processing... ${Create_SoW} button click`,
          },
        },
      ],
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
  // Ask the user to make a Statement of Work (SoW) - let them know to enter company name in dialogue box
  await respond({
    text: `Okay - let's make a Statement of Work (SoW)!!\n Who are we doing this project for? Respond with a company name or the name of the point of contact (POC).`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Okay - let's make a Statement of Work (SoW)!!\n Who are we doing this project for? Respond with a company name or the name of the point of contact (POC).`,
        },
      },
    ],
  });
  // Call views.open with the built-in client
  try {
    // MAKE MODAL OBJECT CALLED CHICKEN - view1 callback_id
    const chicken = client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        type: 'modal',
        // View identifier - USE IN MODAL CALLBACKS
        callback_id: 'view_1',
        private_metadata: 'my neck, my back...',
        title: {
          type: 'plain_text',
          text: 'Modal title',
        },
        // Submit button
        submit: {
          type: 'plain_text',
          text: 'Submit',
        },
        // Close Button
        close: {
          type: 'plain_text',
          text: 'Close',
        },
        blocks: [
          // User Input Block
          {
            // label above dialoge box
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Please enter the company name'
            },
            type: 'input',
            block_id: 'company_name_block', 
            // Label/Title above input field 
            label: {
              type: 'plain_text',
              text: 'Company name',
            },
            // Actual Input Field
            element: {
              type: 'plain_text_input',
              action_id: 'company_name_input',
            },
            // Input Field Placeholder text
            element: {
              type: 'plain_text_input',
              action_id: 'input1',
              placeholder: {
                type: 'plain_text',
                text: 'Type in here',
              }
            }
          },
        ],
      },
    });
  }
  catch (error) {
    console.error(error);
  }
});

slackApp.view('view_1', async ({ ack, view, client }) => {
  await ack();
  const user_input = view.state.values.company_name_block.company_name_input.value;
  await client.chat.postMessage({ //sending metadata out
    text: `The submitted value is: ${user_input}`,
  });
  axios.post('https://eowdv9m1ufg1knl.m.pipedream.net', {
    user_input: user_input
  });
  console.log('Data has been stored and sent');
});

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
