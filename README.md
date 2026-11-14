# Form Studio

[Open Form Studio](https://santos-cabbigat.github.io/Form-Studio/)

Design screens for phones, tablets, and laptops. Insert shapes, text, inputs, tables, reusable components, and windows. Preview triggers and export a standalone HTML site or an editable project JSON.

## Edit a layered component

Open **Layers → Select multiple** and select each layer, including layers hidden behind another shape. You can also use the canvas multi-select tool or Shift-click. Choose **Group**. Tap one member to select the group, then open **Inspector → Code → Copy for ChatGPT**. The copy contains all member layers and triggers together. Paste the complete returned block over the selection and choose **Apply code**. Undo restores the prior state. To edit a complete window, select it in the screen menu, then open Code. Positions and sizes in a snippet use the current device layout.

## Personal workspace

The editor saves changes locally. **Cloud workspace** uses your Personal Ledger app login (or **Set up login** for first use) in the personal Supabase project. Choose **Save to cloud** on one device and **Load cloud copy** on another. Conflicting saves require loading the latest cloud version. Project exports also include the template library. To move a design from the original ChatGPT-hosted editor, export editable JSON there, then use **Export → Import project file** here.

GitHub Pages serves the static files from the repository root. Only the publishable Supabase key belongs in the client. The table definition and row-level access policy are in `supabase/form-studio.sql`.
