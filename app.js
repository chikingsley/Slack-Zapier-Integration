require('dotenv').config();
const axios = require('axios');
const { App, LogLevel } = require('@slack/bolt');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
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

slackApp.command('/helloworld', async ({ ack, payload, context }) => {
  // acknowledge the request
  ack();
  try { 
    const result = await slackApp.client.chat.postMessage({
      token: context.botToken,
      //channel to send message to
      channel: payload.channel_id,
      // include a button in the message
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Go ahead. Click it.'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Click me!'
            },
            action_id: 'button_abc'
          }
       }
      ],
    });
    console.log(result);
  }
  catch (error) {
      console.error(error);
  }
});
 
// Listen for a button invocation with action_id `button_abc`
// You must set up a Request URL under Interactive Components on your app configuration page
slackApp.action('button_abc', async ({ ack, body, context }) => {
  // Acknowledge the button request
  await ack();
  try {
    // Update the message
    const result = await slackApp.client.chat.update({
      token: context.botToken,
      // ts of message to update
      ts: body.message.ts,
      // Channel of message
      channel: body.channel.id,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*The button was clicked!*'
          }
        },
      ],
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
});

//basic listener that publishes a view to the home tab where app lives
slackApp.event('app_home_opened', async ({ event, client }) => {
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

slackApp.action('open_modal_button', async ({ ack, body, client }) => {
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

slackApp.message('hi', async ({ message, client, context }) => {
  const user = await getUserInfo(client, message.user);
  const fullName = user && user.profile.real_name;
  const channelid = message.channel;
  try {
    const result = await slackApp.client.chat.postMessage({
      token: context.botToken,
      channel: channelid,
      text: `Hello, ${fullName}!\nIt's good to see you 😇. What do you want to do today?`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hello, ${fullName}!\nIt's good to see you 😇. What do you want to do today?`,
          },
        },
      ],
    });
    console.log(result);
  } catch (error) {
    console.error(error);
  }
  axios.post('https://hooks.zapier.com/hooks/catch/15387298/3t652em/', {
    user_input: 'hi'
  });
  console.log('api sent hi');
});

slackApp.message('hello', async ({ message, client, context }) => {
  const user = await getUserInfo(client, message.user);
  const fullName = user && user.profile.real_name;
  const channelid = message.channel;
  try {
    const result = await slackApp.client.chat.postMessage({
      token: context.botToken,
      channel: channelid,
      blocks: [
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
    console.log(result);
  } catch (error) {
    console.error(error);
  }
});

/*
//makes modal to ger user input to make sow
slackApp.action('Create_SoW', async ({ ack, body, client, context }) => {
  // acknowledge the button request
  await ack();
  try {
    // update the button message
    const result5 = await slackApp.client.chat.update({
      token: context.botToken,
      // ts of message to update
      ts: body.message_ts,
      // Channel to send message to
      channel: body.channel.id,
      // Message
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
    console.log(result5);
  }
  catch (error) {
    console.error(error);
  }
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
        callback_id: `view_1`,
        private_metadata: JSON.stringify({ channelId: body.channel.id }),  // Store the channel ID
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
            }
          },
          {
            type: 'input',
            block_id: `company_name_block`, 
            // Label/Title above input field 
            label: {
              type: 'plain_text',
              text: 'Company name',
            },
            // Actual Input Field
            element: {
              type: 'plain_text_input',
              action_id: `company_name_input`,
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
*/

slackApp.message('hello', async ({ message, client, context }) => {
  const channelid = message.channel;
  try {
    const result = await slackApp.client.chat.postMessage({
      token: context.botToken,
      channel: channelid,
      blocks: [
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
    console.log(result);
  } catch (error) {
    console.error(error);
  }
});


slackApp.event('message', async ({ event }) => {
  if (event.subtype === 'message_changed') {
    const originalMessage = event.previous_message;
    const updatedMessage = event.message;

    console.log('Message has been modified');
    console.log('Original Message:', originalMessage);
    console.log('Updated Message:', updatedMessage);
    
    // Perform actions based on the modified message
  }
});

slackApp.view('view_1', async ({ ack, view, body, client, context }) => {
  await ack();
  const user_input = view.state.values.company_name_block.company_name_input;
  const privateMetadata = JSON.parse(view.private_metadata);  // Parse the private metadata
  const channelId = privateMetadata.channelId;  // Retrieve the channel ID
  await client.chat.postMessage({ //sending metadata out
    token: context.botToken,
    channel: channelId,
  text: `The submitted value is: ${user_input}`,
  });
  axios.post('https://hooks.zapier.com/hooks/catch/15387298/3t652em/', {
    user_input: user_input
  });
  console.log('Data has been stored and sent');
});

slackApp.command('/runprogram', async ({ ack, body, client }) => {
  await ack();
  try {
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'info_request',
        private_metadata: JSON.stringify({ channelId: body.channel_id }),  // Store the channel ID
        title: {
          type: 'plain_text',
          text: 'Information Request'
        },
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'poc_first_name_block',
            label: {
              type: 'plain_text',
              text: 'POC First Name'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'poc_first_name_input'
            }
          },
          {
            type: 'input',
            block_id: 'poc_last_name_block',
            label: {
              type: 'plain_text',
              text: 'POC Last Name'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'poc_last_name_input'
            }
          },
          {
            type: 'input',
            block_id: 'poc_email_block',
            label: {
              type: 'plain_text',
              text: 'POC Email'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'poc_email_input'
            }
          },
          {
            type: 'input',
            block_id: 'company_name_block',
            label: {
              type: 'plain_text',
              text: 'Company Name'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'company_name_input'
            }
          },
          {
            type: 'input',
            block_id: 'company_address_block',
            label: {
              type: 'plain_text',
              text: 'Company Address'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'company_address_input'
            }
          },
        ]
      }
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
});

// send client info to zapier
slackApp.view('info_request', async ({ ack, view, body, client, context }) => {
  await ack();
  
  const user_inputs = {
    poc_first_name: view.state.values.poc_first_name_block.poc_first_name_input.value,
    poc_last_name: view.state.values.poc_last_name_block.poc_last_name_input.value,
    poc_email: view.state.values.poc_email_block.poc_email_input.value,
    company_name: view.state.values.company_name_block.company_name_input.value,
    company_address: view.state.values.company_address_block.company_address_input.value,
    submission_date: new Date().toISOString()
  };

  const user = body.user.id;
  const privateMetadata = JSON.parse(view.private_metadata);  // Parse the private metadata
  const channelId = privateMetadata.channelId;  // Retrieve the channel ID

  await client.chat.postMessage({ //sending metadata out
    token: context.botToken,
    channel: channelId,
    text: `The submitted values are: ${JSON.stringify(user_inputs, null, 2)}`,
  });
  axios.post('https://hooks.zapier.com/hooks/catch/15387298/3t652em/', {
    user_input: user_inputs
  });
  console.log('Data has been stored and sent');
});

(async () => {
  // Start your app
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
