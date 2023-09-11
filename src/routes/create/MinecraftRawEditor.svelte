<script lang="ts">
  import { onMount } from 'svelte';

  export let formName: string;
  export let value: string; // Just for default value

  let components: {
    letter: string;
    bold: boolean;
    italic: boolean;
    underlined: boolean;
    color: string;
  }[] = value.split('').map((letter) => ({
    letter,
    bold: false,
    italic: false,
    underlined: false,
    color: 'white'
  }));

  onMount(() => {
    const boldButton = document.querySelector('#bold-button')! as HTMLButtonElement;
    const italicButton = document.querySelector('#italic-button')! as HTMLButtonElement;
    const underlineButton = document.querySelector('#underline-button')! as HTMLButtonElement;
    const colorPickers = document.querySelectorAll('[id^="color-"]')! as NodeListOf<HTMLButtonElement>;

    boldButton.addEventListener('click', () => {
      const text = window.getSelection()?.toString();
      if (!text) return;
      const start = components
        .map((c) => c.letter)
        .join('')
        .indexOf(text);
      const end = start + text.length;
      const majorityValue = components.slice(start, end).reduce((acc, curr) => (acc === curr.bold ? acc : !acc), components[start].bold);
      for (let i = start; i < end; i++) components[i].bold = !majorityValue;
    });

    italicButton.addEventListener('click', () => {
      const text = window.getSelection()?.toString();
      if (!text) return;
      const start = components
        .map((c) => c.letter)
        .join('')
        .indexOf(text);
      const end = start + text.length;
      const majorityValue = components.slice(start, end).reduce((acc, curr) => (acc === curr.italic ? acc : !acc), components[start].italic);
      for (let i = start; i < end; i++) components[i].italic = !majorityValue;
    });

    underlineButton.addEventListener('click', () => {
      const text = window.getSelection()?.toString();
      if (!text) return;
      const start = components
        .map((c) => c.letter)
        .join('')
        .indexOf(text);
      const end = start + text.length;
      const majorityValue = components.slice(start, end).reduce((acc, curr) => (acc === curr.underlined ? acc : !acc), components[start].underlined);
      for (let i = start; i < end; i++) components[i].underlined = !majorityValue;
    });

    colorPickers.forEach((colorPicker) => {
      colorPicker.addEventListener('click', () => {
        const text = window.getSelection()?.toString();
        if (!text) return;
        const start = components
          .map((c) => c.letter)
          .join('')
          .indexOf(text);
        const end = start + text.length;
        const color = colorPicker.id.split('-')[1];
        for (let i = start; i < end; i++) components[i].color = color;
      });
    });
  });

  function insertTextAtCursor(text: string) {
    const index = Array.from(document.querySelector('#editor')!.children).findIndex((c) => c.innerHTML.length === 2);
    console.log(index);
    // Clone the component & copy the text
    const newComponent = { ...components[index] };
    newComponent.letter = text;
    components.splice(index + 1, 0, newComponent);
    components = components;
  }

  function createMinecraftJSON(component: typeof components) {
    const json: {
      text: string;
      bold?: boolean;
      italic?: boolean;
      underlined?: boolean;
      color?: string;
    }[] = [];

    // Compress the text of identical styles
    let lastStyle = component[0];
    let lastLetter = component[0].letter;
    for (let i = 1; i < component.length; i++) {
      const currentStyle = component[i];
      if (currentStyle.bold === lastStyle.bold && currentStyle.italic === lastStyle.italic && currentStyle.underlined === lastStyle.underlined && currentStyle.color === lastStyle.color) {
        lastLetter += currentStyle.letter;
      } else {
        json.push({
          text: lastLetter,
          bold: lastStyle.bold ? true : undefined,
          italic: lastStyle.italic ? true : undefined,
          underlined: lastStyle.underlined ? true : undefined,
          color: lastStyle.color
        });
        lastStyle = currentStyle;
        lastLetter = currentStyle.letter;
      }
    }
    json.push({
      text: lastLetter,
      bold: lastStyle.bold ? true : undefined,
      italic: lastStyle.italic ? true : undefined,
      underlined: lastStyle.underlined ? true : undefined,
      color: lastStyle.color
    });

    return JSON.stringify(json);
  }
</script>

<div>
  <div id="editor" contenteditable="true" class="h-24 w-[30rem] border-4 border-white p-2" on:input={(e) => insertTextAtCursor(e.data)}>
    {@html components
      .map((c) => {
        const styles = [];
        if (c.bold) styles.push('font-bold');
        if (c.italic) styles.push('italic');
        if (c.underlined) styles.push('underline');
        return `<span class="${styles.join(' ')}" style="color:${c.color};">${c.letter}</span>`;
      })
      .join('')}
  </div>
  <textarea name={formName} hidden>{createMinecraftJSON(components)}</textarea>
  <button type="button" id="bold-button" class="mr-2 bg-gray-800 p-2 hover:bg-gray-300"> Bold </button>
  <button type="button" id="italic-button" class="mr-2 bg-gray-800 p-2 hover:bg-gray-300">Italic</button>
  <button type="button" id="underline-button" class="mr-2 bg-gray-800 p-2 hover:bg-gray-300">Underline</button>
  <div>
    <button type="button" id="color-red" class="mr-2 bg-red-500 p-2 hover:bg-red-300">Red</button>
    <button type="button" id="color-green" class="mr-2 bg-green-500 p-2 hover:bg-green-300">Green</button>
    <button type="button" id="color-blue" class="mr-2 bg-blue-500 p-2 hover:bg-blue-300">Blue</button>
    <button type="button" id="color-yellow" class="mr-2 bg-yellow-500 p-2 hover:bg-yellow-300">Yellow</button>
    <button type="button" id="color-purple" class="mr-2 bg-purple-500 p-2 hover:bg-purple-300">Purple</button>
    <button type="button" id="color-pink" class="mr-2 bg-pink-500 p-2 hover:bg-pink-300">Pink</button>
    <button type="button" id="color-orange" class="mr-2 bg-orange-500 p-2 hover:bg-orange-300">Orange</button>
    <button type="button" id="color-gray" class="mr-2 bg-gray-500 p-2 hover:bg-gray-300">Gray</button>
    <button type="button" id="color-black" class="mr-2 bg-black p-2 hover:bg-gray-300">Black</button>
    <button type="button" id="color-white" class="mr-2 bg-white p-2 hover:bg-gray-300">White</button>
  </div>
  {createMinecraftJSON(components)}
  {JSON.stringify(components)}
</div>
