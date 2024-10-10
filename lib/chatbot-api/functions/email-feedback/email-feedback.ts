// import nodemailer from 'nodemailer';
// import { ApiClient } from "../../../user-interface/app/src/common/api-client/api-client";
// import { env } from 'process';

// const feedbackCategories = [
//   {label: "Eligibility", value:"eligibility", disabled: false},
//   {label: "Coverage Types", value:"coverage types", disabled: false},
//   {label: "Sources", value:"sources", disabled: false},
//   {label: "Other", value:"other", disabled: false}
// ]
// const topics = ['Elgibility', 'Coverage Types', 'Sources', 'Other'];

// // Function to fetch feedback from the last week
// export const fetchWeeklyFeedback = async (appContext: any): Promise<string> => {
//   // calculate the timeframe between when the function is called and exactly 7 days ago
//   const todayDate = new Date(); 
//   const lastWeekDate = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
//   const apiClient = new ApiClient(appContext);
//   let content = '';
//   try {
//     // retrieve feedback data from each category and add it to the email's contents
//     for (const topic in topics) {
//       const feedbackItem = await apiClient.userFeedback.getUserFeedback(topic, todayDate.toString(),lastWeekDate.toString());
//         const feedbackList = feedbackItem.map((item) => {
//         return `User: ${item.user}, Feedback: ${item.message}, Date: ${item.date}`;
//       });

//       content += feedbackList;
//     }
    

//     return content;
//   } catch (e) {
//     console.error('Error fetching feedback: ', e);
//     return '';
//   }
// };

// // https://nodemailer.com/usage/using-gmail/


// /**
//  * Function to send feedback email
//  * 
//  * adminEmail - receiver
//  * feedbackData - email body
//  * */
// export const sendFeedbackEmail = async (adminEmail: string, feedbackData: string) => {
//   const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false, // Use TLS
//     auth: {
//       user: env.SENDER_EMAIL,
//       pass: env.SENDER_EMAIL_PSWD
//     },
//   });
//   const date = new Date();
//   const mailOptions = {
//     from: env.SENDER_EMAIL,
//     to: adminEmail,
//     subject: 'Weekly Feedback Report ' + date.toLocaleString(),
//     text: feedbackData,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log('successfully sent email');
//   } catch (error) {
//     console.error('Error sending feedback email:', error);
//   }
// };