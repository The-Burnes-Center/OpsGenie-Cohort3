import { ButtonProps, Button } from "@cloudscape-design/components";
import useOnFollow from "../../common/hooks/use-on-follow";
import React from "react";

interface CustomButtonProps extends ButtonProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function RouterButton(props: CustomButtonProps) {
  
  const onFollow = useOnFollow();
 
  // If the button doesn't have children or text (could be icon-only), 
  // ensure it has an aria-label or proper accessible name
  if (!props.children && props.iconName && !props['aria-label']) {
    return (
      <Button 
        {...props} 
        onFollow={onFollow}
        aria-label={`${props.iconName} button`}
      >
        <span className="visually-hidden">{props.iconName} button</span>
      </Button>
    );
  }

  return <Button {...props} onFollow={onFollow} />;
}
