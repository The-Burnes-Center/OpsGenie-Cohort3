// import nodemailer from 'nodemailer';
// import { ApiClient } from "../../../user-interface/app/src/common/api-client/api-client";

// export const feedbackCategories = [
//   {label: "Eligibility", value:"eligibility", disabled: false},
//   {label: "Coverage Types", value:"coverage types", disabled: false},
//   {label: "Sources", value:"sources", disabled: false},
//   {label: "Other", value:"other", disabled: false}
// ]
// const topics = ['Elgibility', 'Coverage Types', 'Sources', 'Other'];

// // Function to fetch feedback from the last week
// const fetchWeeklyFeedback = async (appContext: any): Promise<string> => {
//   const todayDate = new Date(); 
//   const lastWeekDate = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
//   const apiClient = new ApiClient(appContext);
//   let content = '';
//   try {
//     for (const topic in topics) {
//       const feedbackItem = apiClient.userFeedback.getUserFeedback(topic, todayDate.toString(),lastWeekDate.toString());
  
//       // Transform feedback into readable format
//       const feedbackList = feedbackItem.map((item) => {
//         return `User: ${item.user}, Feedback: ${item.message}, Date: ${item.date}`;
//       });

//       content += feedbackList;
//     }
    

//     return content;
//   } catch (error) {
//     console.error('Error fetching feedback:', error);
//     return '';
//   }
// };

// // Configure email transporter (You can use Gmail, SMTP, etc.) LOOK UP WHAT THESE THINGS ARE IDK WHAT THEY MEAN
// const transporter = nodemailer.createTransport({
//   service: '',
//   auth: {
//     user: 'email',
//     pass: 'email password or "app-specific password" whatever that means', // Replace with your password or app-specific password
//   },
// });

// /**
//  * Function to send feedback email
//  * 
//  * adminEmail - receiver
//  * feedbackData - email body
//  * */
// const sendFeedbackEmail = async (adminEmail: string, feedbackData: string, date: string) => {
//   const mailOptions = {
//     from: 'SENDER',
//     to: adminEmail,
//     subject: 'Weekly Feedback Report ' + date,
//     text: feedbackData,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log('successfully sent email');
//   } catch (error) {
//     console.error('Error sending feedback email:', error);
//   }
// };