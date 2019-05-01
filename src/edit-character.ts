import { ipcRenderer } from 'electron';
import { editCharacterChannel, saveCharacterChannel } from './constants';
import { UnicodeCharacter } from './models';

let currentCharacter: UnicodeCharacter;
const valueInput = document.getElementById('char-value') as HTMLInputElement;
const nameInput = document.getElementById('char-name') as HTMLInputElement;
const aliasInput = document.getElementById('char-alias') as HTMLInputElement;

ipcRenderer.on(editCharacterChannel, (event: any, selection: UnicodeCharacter) => {
    showSelection(selection);
});

document.getElementById('cancel').onclick = (event: MouseEvent) => {
    window.close();
};

document.getElementById('edit-form').onsubmit = (event: Event) => {
    event.preventDefault();
    if (currentCharacter.userDefined) {
        if (!nameInput.value) {
            alert('Name required.');
            return;
        }
        if (!valueInput.value) {
            alert('Value required.');
            return;
        }
        currentCharacter.name = nameInput.value;
        currentCharacter.value = valueInput.value;

        if (!currentCharacter.number) {
            // number has not yet been generated, create one now
            currentCharacter.number = `user-${currentCharacter.name}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }
    currentCharacter.alias = aliasInput.value;
    ipcRenderer.send(saveCharacterChannel, currentCharacter);
    window.close();
};

function showSelection(selection: UnicodeCharacter) {
    currentCharacter = selection;
    valueInput.value = selection.value;
    nameInput.value = selection.name;
    if (selection.alias) {
        aliasInput.value = selection.alias;
    }
    if (!selection.userDefined) {
        nameInput.readOnly = true;
        valueInput.readOnly = true;
        aliasInput.focus();
    } else {
        nameInput.focus();
    }
}
