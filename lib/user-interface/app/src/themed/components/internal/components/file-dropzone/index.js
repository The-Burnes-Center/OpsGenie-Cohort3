// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import clsx from 'clsx';
import { fireNonCancelableEvent } from '../../events';
import { useFilesDragging } from './use-files-dragging';
import styles from './styles.css.js';
export { useFilesDragging };
export default function InternalFileDropzone({ onChange, children }) {
    const [isDropzoneHovered, setDropzoneHovered] = useState(false);
    const onDragOver = (event) => {
        event.preventDefault();
        if (event.dataTransfer) {
            setDropzoneHovered(true);
            event.dataTransfer.dropEffect = 'copy';
        }
    };
    const onDragLeave = (event) => {
        event.preventDefault();
        setDropzoneHovered(false);
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'none';
        }
    };
    const onDrop = (event) => {
        event.preventDefault();
        setDropzoneHovered(false);
        fireNonCancelableEvent(onChange, { value: Array.from(event.dataTransfer.files) });
    };
    return (React.createElement("div", { className: clsx(styles.root, isDropzoneHovered && styles.hovered), onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop },
        React.createElement("div", { className: styles.content }, children)));
}
//# sourceMappingURL=index.js.map