import { ipcRenderer } from 'electron';
import { IcpChannels } from './constants';
import { UnicodeCharacter } from './models';

let currentCharacter: UnicodeCharacter;
const valueInput = document.getElementById('char-value') as HTMLInputElement;
const nameInput = document.getElementById('char-name') as HTMLInputElement;
const aliasInput = document.getElementById('char-alias') as HTMLInputElement;

ipcRenderer.on(IcpChannels.editCharacter, (event: any, selection: UnicodeCharacter) => {
    showSelection(selection);
});

document.getElementById('cancel').onclick = () => {
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

        if (!currentCharacter.code) {
            // number has not yet been generated, create one now
            currentCharacter.code = `user-${currentCharacter.name}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }
    currentCharacter.alias = aliasInput.value;
    ipcRenderer.send(IcpChannels.saveCharacter, currentCharacter);
    window.close();
};

const showSelection = (selection: UnicodeCharacter) => {
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
