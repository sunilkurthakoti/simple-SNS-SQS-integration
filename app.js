const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path'); // Add path module

const app = express();
const port = 3000;

// Configure AWS SDK to use IAM role credentials automatically
AWS.config.update({ region: 'us-east-1' }); // Replace with your desired AWS region

// Create SQS and SNS service objects
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set EJS as the view engine and set the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve send.html
app.get('/send', (req, res) => {
  res.sendFile(path.join(__dirname, 'send.html'));
});

// Send message to SQS and notify via SNS
app.post('/send', (req, res) => {
  const { message } = req.body;

  // SQS Parameters
  const sqsParams = {
    MessageBody: message,
    QueueUrl: 'https://sqs.us-east-1.amazonaws.com/361769568829/sqs-project', // Replace with your SQS queue URL
  };

  // Send message to SQS
  sqs.sendMessage(sqsParams, (err, sqsData) => {
    if (err) {
      console.error('Error sending message to SQS:', err);
      res.status(500).send('Error sending message to SQS');
    } else {
      console.log('Message sent to SQS:', sqsData.MessageId);

      // SNS Parameters
      const snsParams = {
        Message: `A new message has been sent to the SQS queue: ${message}\n\nClick here to view messages: http://localhost:3000/messages`,
        Subject: 'New Message Notification',
        TopicArn: 'arn:aws:sns:us-east-1:361769568829:sns-project', // Replace with your SNS Topic ARN
      };

      // Send email notification via SNS
      sns.publish(snsParams, (snsErr, snsData) => {
        if (snsErr) {
          console.error('Error sending email via SNS:', snsErr);
          res.status(500).send('Error sending email via SNS');
        } else {
          console.log('Email sent via SNS:', snsData.MessageId);
          res.redirect('/');
        }
      });
    }
  });
});

// Serve messages.ejs
app.get('/messages', (req, res) => {
  // Retrieve messages from SQS queue
  const params = {
    QueueUrl: 'https://sqs.us-east-1.amazonaws.com/361769568829/sqs-project', // Replace with your SQS queue URL
    AttributeNames: ['All'],
    MaxNumberOfMessages: 10, // Adjust as needed
    WaitTimeSeconds: 0,
  };

  sqs.receiveMessage(params, (err, data) => {
    if (err) {
      console.error('Error receiving messages from SQS:', err);
      res.status(500).send('Error receiving messages from SQS');
    } else {
      const messages = data.Messages || [];
      res.render('messages', { messages });
    }
  });
});

// Listen on port
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
