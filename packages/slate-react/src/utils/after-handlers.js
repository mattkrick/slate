import { Change } from 'slate'
import Hotkeys from 'slate-hotkeys'
import findRange from '../utils/find-range'
import updateComposition from './update-composition';

export function handleBeforeInputLevel2 (event, change, editor) {
  // TODO: iPhone user, please refactor to remove `editor` it shouldn't be required
  const [targetRange] = event.getTargetRanges()
  if (!targetRange) return

  switch (event.inputType) {
    case 'deleteContentBackward': {
      // event.preventDefault()

      const range = findRange(targetRange, editor.value)
      editor.change(change => change.deleteAtRange(range))
      break
    }

    case 'insertLineBreak': // intentional fallthru
    case 'insertParagraph': {
      // event.preventDefault()
      const range = findRange(targetRange, editor.value)

      if (change.value.isInVoid) {
        change.collapseToStartOfNextText()
      } else {
        change.splitBlockAtRange(range)
      }

      break
    }

    case 'insertReplacementText': // intentional fallthru
    case 'insertText': {
      // `data` should have the text for the `insertText` input type and
      // `dataTransfer` should have the text for the `insertReplacementText`
      // input type, but Safari uses `insertText` for spell check replacements
      // and sets `data` to `null`.
      const text =
        event.data == null
          ? event.dataTransfer.getData('text/plain')
          : event.data

      if (text == null) return

      // event.preventDefault()

      const { value } = editor
      const { selection } = value
      const range = findRange(targetRange, value)

      editor.change(change => {
        change.insertTextAtRange(range, text, selection.marks)

        // If the text was successfully inserted, and the selection had marks
        // on it, unset the selection's marks.
        if (selection.marks && value.document != change.value.document) {
          change.select({ marks: null })
        }
      })
      break
    }
  }
}

const HANDLED_INPUT_TYPES = ['insertText', 'insertCompositionText', 'deleteContentBackward', 'deleteContentForward']
export function handleInputBelowLevel2(data, inputType, change) {
  console.log('input type', inputType)
  if (HANDLED_INPUT_TYPES.includes(inputType)) {
    if (inputType === 'insertText' && data.length === 1) {
      change.insertText(data)
    } else {
      // IMEs can use insertText for autocomplete and deleteContentBackward
      // for autocorrect (eg thats => that's)
      // more efficient handlers would require an accurate target range
      updateComposition(change)
    }
  }
}

export function handleSplit(change) {
  return change.value.isInVoid
    ? change.collapseToStartOfNextText()
    : change.splitBlock()
}

export function handleDeleteChar(event, change) {
  const isRemoveText = getIsRemoveText(change)
  if (!isRemoveText) {
    // event.preventDefault()
    change.deleteBackward()
  }
  return isRemoveText
}

export function getBlockLength(change) {
  const { value: { document, selection: { anchorKey, focusKey } } } = change
  // if it's multi-block, bail
  if (anchorKey !== focusKey) return -1
  const block = document.getClosestBlock(anchorKey)
  return block.text.length
}
export function isDefaultRemoveTextBehavior(change) {
  const numChars = getBlockLength(change)
  if (numChars === -1) return false
  const {anchorOffset, focusOffset, isCollapsed} = window.getSelection()
  const numCharsToRemove = isCollapsed ? 1 : focusOffset - anchorOffset
  // the DOM natively removes zero-length blocks, so use special handling
  return numChars !== numCharsToRemove
}

function getIsRemoveText(change) {
  const tmpChange = new Change({ value: change.value })
  tmpChange.deleteBackward()
  const isRemoveText = !!tmpChange.operations.find((op) => op.type === 'remove_text')
  if (isRemoveText) {
    return isDefaultRemoveTextBehavior(change)
  }
  return false
}
