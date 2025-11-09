### 2.2. Enhanced NFT Interaction & Utility

We will add features that allow users to do more with their NFTs directly from this page.

-   **Full-Screen 3D Viewer**:
    -   Add an "Expand" icon to the 3D viewer control panel.
    -   Clicking this will open the `NFTViewer3D` component in a full-screen modal for a more immersive experience.

-   **Enhanced Social Sharing (Digital Trading Card)**:
    -   The "Share" button will trigger the client-side generation of a high-quality "digital trading card" image.
    -   This card will be dynamically created using the selected NFT's data (image, name, attributes) and your project's branding.
    -   The user can then download this image to share on social media, turning them into organic marketers.
    -   This will be achieved using the `html-to-image` library to capture a hidden React component.

### 2.3. Richer UI & Data Display

To make the page more visually impressive and informative, we will enhance the data presentation.

-   **Collection Statistics Dashboard**:
    -   Above the main layout, add a new section displaying aggregate statistics:
        -   **Total Collection Power**: Sum of `power` from all owned NFTs.
        -   **Rarity Distribution**: A small bar chart showing the count of NFTs per rarity tier.
        -   **Owned NFTs**: The total count, which is already present but can be moved to this new dashboard.

-   **Comprehensive Details Panel**:
    -   The current info overlay is minimal. It will be updated to display **all** attributes from the `NFTMetadata.attributes` array, providing a complete overview of the NFT's traits.

-   **Improved Loading States**:
    -   Replace the current loading spinner in the gallery with **skeleton loaders**. Each gallery item will render as a shimmering placeholder, which improves the perceived loading speed and user experience.

---

## 3. Implementation Plan

1.  **Dependency Installation**: Install the `html-to-image` library (`npm install html-to-image`).

2.  **State Management**: Consolidate gallery state (class filter, sort order, search query) into a single state object or `useReducer`.

3.  **Component Breakdown**:
    -   Create a new `ShareableCard.tsx` component. This component is styled to look exactly like the final shareable image and will be rendered off-screen.
    -   Create a new `GalleryControls` component to house the filter, sort, and search inputs.
    -   Create a `CollectionStats` component for the new dashboard.
    -   Modify `NFTViewer3D` to accept a prop for entering full-screen mode.

4.  **Logic Update**:
    -   Implement the `handleShare` function in `MyNFTPage` using `html-to-image` to capture the `ShareableCard` component and trigger a download.
    -   Update the `useMemo` hook for `displayNFTs` to incorporate the new filtering, sorting, and search logic.

5.  **UI Integration**: Add the new components and buttons to the `MyNFTPage` component, ensuring the layout remains responsive.
