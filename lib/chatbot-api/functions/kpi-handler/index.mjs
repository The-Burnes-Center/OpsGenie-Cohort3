export const handler = async (event) => {
  if (event.routeKey === 'POST') {
    try {
      const claims = event.requestContext.authorizer.jwt.claims
      const data = JSON.parse(event.body);
      const params = {
        TableName: 'mec-chatbot-logs',
        Item: data,
      };
      await dynamoDb.put(params).promise();
      console.log("Interaction logged successfully!!!!!!! :", params.Item);
      return {
        statusCode: 200,
        body: JSON.stringify(params.Item)
      };
  
    } catch (error) {
      console.log(error);
      return {
        statusCode: 500,
        body: error
      }
    }
  } else if (event.routeKey === 'GET') {
    try {

      const command = new QueryCommand({
        TableName: "mec-chatbot-logs",
      });
      const response = await dynamoDb.QueryCommand(command);
      console.log(response);
      return {
        statusCode: 200,
        body: JSON.stringify(params.Item)
      };
    } catch (error) {
      console.log(error)
      return {
        statusCode: 500,
        body: error
      }
    }
  }
};
