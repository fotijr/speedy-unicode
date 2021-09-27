import { ipcRenderer } from 'electron';
import { UnicodeCharacter } from './models';

ipcRenderer.on('selection-made', (event: any, selection: UnicodeCharacter) => {
    showSelection(selection.value);
});

const showSelection = (selection: string) => {
    const body = document.getElementById('selection-made');
    const selectedNode = document.getElementById('char-selected');
    body.classList.remove('hide');
    selectedNode.innerHTML = selection;
    setTimeout(() => {
        // body.classList.add('hide');
        selectedNode.innerHTML = '';
    }, 450);
}
