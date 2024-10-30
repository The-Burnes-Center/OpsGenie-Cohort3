// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import InternalLiveRegion from '../live-region/internal';
import styles from './styles.css.js';
// Debounce delay for live region (based on testing with VoiceOver)
const LIVE_REGION_DELAY = 2000;
export function SearchResults({ id, children }) {
    return (React.createElement("span", { className: styles.results },
        React.createElement(InternalLiveRegion, { delay: LIVE_REGION_DELAY, tagName: "span" },
            React.createElement("span", { id: id }, children))));
}
//# sourceMappingURL=search-results.js.map