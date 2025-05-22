import React, { useEffect, useState, useRef } from "react";
import { Box, Link, Modal, TextContent, Button } from "@cloudscape-design/components";

export function TruncatedTextCell({ text, maxLength = 50 }) {
  const [showModal, setShowModal] = useState(false);
  const previousFocus = useRef(null);

  const handleShowMore = () => {
    previousFocus.current = document.activeElement;
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    if (previousFocus.current) {
      setTimeout(() => {
        if (previousFocus.current) {
          previousFocus.current.focus();
        }
      }, 0);
    }
  };

  const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

  useEffect(() => {
    const interval = setInterval(() => {
      const dismissButtons = document.querySelectorAll('button.awsui_dismiss-control_1d2i7_11r6m_431');
  
      dismissButtons.forEach((button) => {
        if (!button.hasAttribute('aria-label')) {
          button.setAttribute('aria-label', 'Close modal');
        }
      });
  
      if (dismissButtons.length > 0) {
        clearInterval(interval);
      }
    }, 500); // check every 500ms
  
    return () => clearInterval(interval);
  }, []);

  // Focus trap for modal
  useEffect(() => {
    if (showModal) {
      // Focus the first focusable element in the modal
      const modal = document.querySelector('.awsui_dialog_1q96c_1qpdf_93');
      if (modal) {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    }
  }, [showModal]);
  
  return (
    <>
      <Box>
        <TextContent>{truncatedText}</TextContent>
        {text.length > maxLength && (
          <Button
            onClick={handleShowMore}
            aria-haspopup="dialog"
            aria-label="View full text"
          >
            Show More
          </Button>
        )}
      </Box>
      <Modal
        onDismiss={handleClose}
        visible={showModal}
        header="Full Text"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={handleClose}>Close</Button>
          </Box>
        }
      >
        <TextContent>{text}</TextContent>
      </Modal>
    </>
  );
}