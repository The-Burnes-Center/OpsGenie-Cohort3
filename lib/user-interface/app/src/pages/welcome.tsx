import {
  ContentLayout,
  Header,
  Cards,
  Container,
  SpaceBetween,
  Link,
  BreadcrumbGroup,
  Button,
  Box,
} from "@cloudscape-design/components";
import BaseAppLayout from "../components/base-app-layout";
import RouterButton from "../components/wrappers/router-button";
import useOnFollow from "../common/hooks/use-on-follow";
import { CHATBOT_NAME } from "../common/constants";
import { Auth } from "aws-amplify";

export default function Welcome() {
  const onFollow = useOnFollow();

  const handleSignIn = () => {
    Auth.federatedSignIn();
  };

  return (
    <BaseAppLayout
      breadcrumbs={
        <BreadcrumbGroup
          onFollow={onFollow}
          items={[
            {
              text: CHATBOT_NAME,
              href: "/",
            },
          ]}
        />
      }
      content={
        <ContentLayout
          header={
            <Header
              variant="h1"
              description="You have been successfully signed out. Click the button below to sign back in."
              actions={
                <Button
                  iconAlign="right"
                  iconName="user-profile"
                  variant="primary"
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
              }
            >
              {CHATBOT_NAME} - Signed Out
            </Header>
          }
        >
          <SpaceBetween size="l">
            <Container>
              <Box textAlign="center" padding="xl">
                <Header variant="h2">
                  Thank you for using {CHATBOT_NAME}
                </Header>
                <p>
                  You have been successfully signed out from the system. 
                  To continue using the chatbot, please sign in again.
                </p>
                <Button
                  variant="primary"
                  onClick={handleSignIn}
                >
                  Sign In to Continue
                </Button>
              </Box>
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
    ></BaseAppLayout>
  );
}
