import {
  ButtonDropdownProps,
  ButtonDropdown,
} from "@cloudscape-design/components";
import useOnFollow from "../../common/hooks/use-on-follow";
import React from "react";

interface CustomDropdownProps extends ButtonDropdownProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function RouterButtonDropdown(props: CustomDropdownProps) {
  const onFollow = useOnFollow();

  // Ensure dropdown buttons have proper accessibility
  if (!props.children && !props.text && props.iconName && !props['aria-label']) {
    return (
      <ButtonDropdown 
        {...props} 
        onItemFollow={onFollow} 
        aria-label={props.ariaLabel || `${props.iconName} dropdown menu`}
      />
    );
  }

  return <ButtonDropdown {...props} onItemFollow={onFollow} />;
}
