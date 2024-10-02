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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsdUNBQXVDO0FBQ3ZDLDRGQUE0RjtBQUU1RixzQ0FBc0M7QUFDdEMsa0VBQWtFO0FBQ2xFLHdFQUF3RTtBQUN4RSwwREFBMEQ7QUFDMUQscURBQXFEO0FBQ3JELElBQUk7QUFDSix1RUFBdUU7QUFFdkUsbURBQW1EO0FBQ25ELDRFQUE0RTtBQUM1RSxtQ0FBbUM7QUFDbkMsa0ZBQWtGO0FBQ2xGLGlEQUFpRDtBQUNqRCxzQkFBc0I7QUFDdEIsVUFBVTtBQUNWLG9DQUFvQztBQUNwQywwSEFBMEg7QUFFMUgsbURBQW1EO0FBQ25ELDBEQUEwRDtBQUMxRCxzRkFBc0Y7QUFDdEYsWUFBWTtBQUVaLGlDQUFpQztBQUNqQyxRQUFRO0FBR1Isc0JBQXNCO0FBQ3RCLHNCQUFzQjtBQUN0Qix3REFBd0Q7QUFDeEQsaUJBQWlCO0FBQ2pCLE1BQU07QUFDTixLQUFLO0FBRUwsa0hBQWtIO0FBQ2xILG1EQUFtRDtBQUNuRCxpQkFBaUI7QUFDakIsWUFBWTtBQUNaLHFCQUFxQjtBQUNyQixvSUFBb0k7QUFDcEksT0FBTztBQUNQLE1BQU07QUFFTixNQUFNO0FBQ04scUNBQXFDO0FBQ3JDLE1BQU07QUFDTiwyQkFBMkI7QUFDM0IsK0JBQStCO0FBQy9CLFFBQVE7QUFDUixnR0FBZ0c7QUFDaEcsMEJBQTBCO0FBQzFCLHNCQUFzQjtBQUN0QixzQkFBc0I7QUFDdEIsaURBQWlEO0FBQ2pELDBCQUEwQjtBQUMxQixPQUFPO0FBRVAsVUFBVTtBQUNWLCtDQUErQztBQUMvQyw4Q0FBOEM7QUFDOUMsc0JBQXNCO0FBQ3RCLDZEQUE2RDtBQUM3RCxNQUFNO0FBQ04sS0FBSyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCBub2RlbWFpbGVyIGZyb20gJ25vZGVtYWlsZXInO1xuLy8gaW1wb3J0IHsgQXBpQ2xpZW50IH0gZnJvbSBcIi4uLy4uLy4uL3VzZXItaW50ZXJmYWNlL2FwcC9zcmMvY29tbW9uL2FwaS1jbGllbnQvYXBpLWNsaWVudFwiO1xuXG4vLyBleHBvcnQgY29uc3QgZmVlZGJhY2tDYXRlZ29yaWVzID0gW1xuLy8gICB7bGFiZWw6IFwiRWxpZ2liaWxpdHlcIiwgdmFsdWU6XCJlbGlnaWJpbGl0eVwiLCBkaXNhYmxlZDogZmFsc2V9LFxuLy8gICB7bGFiZWw6IFwiQ292ZXJhZ2UgVHlwZXNcIiwgdmFsdWU6XCJjb3ZlcmFnZSB0eXBlc1wiLCBkaXNhYmxlZDogZmFsc2V9LFxuLy8gICB7bGFiZWw6IFwiU291cmNlc1wiLCB2YWx1ZTpcInNvdXJjZXNcIiwgZGlzYWJsZWQ6IGZhbHNlfSxcbi8vICAge2xhYmVsOiBcIk90aGVyXCIsIHZhbHVlOlwib3RoZXJcIiwgZGlzYWJsZWQ6IGZhbHNlfVxuLy8gXVxuLy8gY29uc3QgdG9waWNzID0gWydFbGdpYmlsaXR5JywgJ0NvdmVyYWdlIFR5cGVzJywgJ1NvdXJjZXMnLCAnT3RoZXInXTtcblxuLy8gLy8gRnVuY3Rpb24gdG8gZmV0Y2ggZmVlZGJhY2sgZnJvbSB0aGUgbGFzdCB3ZWVrXG4vLyBjb25zdCBmZXRjaFdlZWtseUZlZWRiYWNrID0gYXN5bmMgKGFwcENvbnRleHQ6IGFueSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4vLyAgIGNvbnN0IHRvZGF5RGF0ZSA9IG5ldyBEYXRlKCk7IFxuLy8gICBjb25zdCBsYXN0V2Vla0RhdGUgPSBuZXcgRGF0ZSh0b2RheURhdGUuZ2V0VGltZSgpIC0gNyAqIDI0ICogNjAgKiA2MCAqIDEwMDApO1xuLy8gICBjb25zdCBhcGlDbGllbnQgPSBuZXcgQXBpQ2xpZW50KGFwcENvbnRleHQpO1xuLy8gICBsZXQgY29udGVudCA9ICcnO1xuLy8gICB0cnkge1xuLy8gICAgIGZvciAoY29uc3QgdG9waWMgaW4gdG9waWNzKSB7XG4vLyAgICAgICBjb25zdCBmZWVkYmFja0l0ZW0gPSBhcGlDbGllbnQudXNlckZlZWRiYWNrLmdldFVzZXJGZWVkYmFjayh0b3BpYywgdG9kYXlEYXRlLnRvU3RyaW5nKCksbGFzdFdlZWtEYXRlLnRvU3RyaW5nKCkpO1xuICBcbi8vICAgICAgIC8vIFRyYW5zZm9ybSBmZWVkYmFjayBpbnRvIHJlYWRhYmxlIGZvcm1hdFxuLy8gICAgICAgY29uc3QgZmVlZGJhY2tMaXN0ID0gZmVlZGJhY2tJdGVtLm1hcCgoaXRlbSkgPT4ge1xuLy8gICAgICAgICByZXR1cm4gYFVzZXI6ICR7aXRlbS51c2VyfSwgRmVlZGJhY2s6ICR7aXRlbS5tZXNzYWdlfSwgRGF0ZTogJHtpdGVtLmRhdGV9YDtcbi8vICAgICAgIH0pO1xuXG4vLyAgICAgICBjb250ZW50ICs9IGZlZWRiYWNrTGlzdDtcbi8vICAgICB9XG4gICAgXG5cbi8vICAgICByZXR1cm4gY29udGVudDtcbi8vICAgfSBjYXRjaCAoZXJyb3IpIHtcbi8vICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBmZXRjaGluZyBmZWVkYmFjazonLCBlcnJvcik7XG4vLyAgICAgcmV0dXJuICcnO1xuLy8gICB9XG4vLyB9O1xuXG4vLyAvLyBDb25maWd1cmUgZW1haWwgdHJhbnNwb3J0ZXIgKFlvdSBjYW4gdXNlIEdtYWlsLCBTTVRQLCBldGMuKSBMT09LIFVQIFdIQVQgVEhFU0UgVEhJTkdTIEFSRSBJREsgV0hBVCBUSEVZIE1FQU5cbi8vIGNvbnN0IHRyYW5zcG9ydGVyID0gbm9kZW1haWxlci5jcmVhdGVUcmFuc3BvcnQoe1xuLy8gICBzZXJ2aWNlOiAnJyxcbi8vICAgYXV0aDoge1xuLy8gICAgIHVzZXI6ICdlbWFpbCcsXG4vLyAgICAgcGFzczogJ2VtYWlsIHBhc3N3b3JkIG9yIFwiYXBwLXNwZWNpZmljIHBhc3N3b3JkXCIgd2hhdGV2ZXIgdGhhdCBtZWFucycsIC8vIFJlcGxhY2Ugd2l0aCB5b3VyIHBhc3N3b3JkIG9yIGFwcC1zcGVjaWZpYyBwYXNzd29yZFxuLy8gICB9LFxuLy8gfSk7XG5cbi8vIC8qKlxuLy8gICogRnVuY3Rpb24gdG8gc2VuZCBmZWVkYmFjayBlbWFpbFxuLy8gICogXG4vLyAgKiBhZG1pbkVtYWlsIC0gcmVjZWl2ZXJcbi8vICAqIGZlZWRiYWNrRGF0YSAtIGVtYWlsIGJvZHlcbi8vICAqICovXG4vLyBjb25zdCBzZW5kRmVlZGJhY2tFbWFpbCA9IGFzeW5jIChhZG1pbkVtYWlsOiBzdHJpbmcsIGZlZWRiYWNrRGF0YTogc3RyaW5nLCBkYXRlOiBzdHJpbmcpID0+IHtcbi8vICAgY29uc3QgbWFpbE9wdGlvbnMgPSB7XG4vLyAgICAgZnJvbTogJ1NFTkRFUicsXG4vLyAgICAgdG86IGFkbWluRW1haWwsXG4vLyAgICAgc3ViamVjdDogJ1dlZWtseSBGZWVkYmFjayBSZXBvcnQgJyArIGRhdGUsXG4vLyAgICAgdGV4dDogZmVlZGJhY2tEYXRhLFxuLy8gICB9O1xuXG4vLyAgIHRyeSB7XG4vLyAgICAgYXdhaXQgdHJhbnNwb3J0ZXIuc2VuZE1haWwobWFpbE9wdGlvbnMpO1xuLy8gICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzZnVsbHkgc2VudCBlbWFpbCcpO1xuLy8gICB9IGNhdGNoIChlcnJvcikge1xuLy8gICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgZmVlZGJhY2sgZW1haWw6JywgZXJyb3IpO1xuLy8gICB9XG4vLyB9OyJdfQ==