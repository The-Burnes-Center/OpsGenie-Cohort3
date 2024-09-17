// Import necessary modules

export const handler = async (event) => {
  if (event.routeKey === 'POST') {
    try {
      const claims = event.requestContext.authorizer.jwt.claims
      const data = JSON.parse(event.body);
      const params = {
        TableName: 'mec-chatbot-logs',
        Item: data,
      };
      // ADD ERROR HANDLING STUFF
      await dynamoDb.put(params).promise();
      console.log("Interaction logged successfully!!!!!!! :", params.Item);
  
    } catch (error) {
      console.log(error)
    }
  } else if (event.routeKey === 'GET') {
    try {

      const command = new QueryCommand({
        TableName: "mec-chatbot-logs",
      });
      const response = await dynamoDb.QueryCommand(command);
      console.log(response);     
    } catch (error) {
      console.log(error)
    }
  }

};
