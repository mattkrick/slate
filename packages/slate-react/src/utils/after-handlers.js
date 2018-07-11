import { Change } from 'slate'
import Hotkeys from 'slate-hotkeys'
import findRange from '../utils/find-range'

export function handleBeforeInputLevel2 (event, editor) {
  // TODO: iPhone user, please refactor to event, change & leave editor out of it
  const [targetRange] = event.getTargetRanges()
  if (!targetRange) return

  switch (event.inputType) {
    case 'deleteContentBackward': {
      event.preventDefault()

      const range = findRange(targetRange, editor.value)
      editor.change(change => change.deleteAtRange(range))
      break
    }

    case 'insertLineBreak': // intentional fallthru
    case 'insertParagraph': {
      event.preventDefault()
      const range = findRange(targetRange, editor.value)

      editor.change(change => {
        if (change.value.isInVoid) {
          change.collapseToStartOfNextText()
        } else {
          change.splitBlockAtRange(range)
        }
      })

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

      event.preventDefault()

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

export function handleInputBelowLevel2(data, inputType, change) {
  console.log('input type', inputType)
  if (inputType === 'insertText') {
    change.insertText(data)
  } else if (inputType === 'insertCompositionText') {
    
  } else if (inputType === 'deleteContentBackward') {
    change.deleteCharBackward()
  } else if (inputType === 'deleteContentForward') {
    change.deleteCharForward()
  }
}

export function handleSplit(change) {
  return change.value.isInVoid
    ? change.collapseToStartOfNextText()
    : change.splitBlock()
}

export function handleDeleteChar(event, change, method) {
  const isRemoveText = getIsRemoveText(change, method)
  if (!isRemoveText) {
    event.preventDefault()
    change[method]()
  }
  return isRemoveText
}

function getIsRemoveText(change, method) {
  const tmpChange = new Change({ value: change.value })
  tmpChange[method]()
  const isRemoveText = !!tmpChange.operations.find((op) => op.type === 'remove_text')
  if (isRemoveText) {
    const { value: { document, selection: { anchorKey } } } = change
    const block = document.getClosestBlock(anchorKey)
    // i have no idea why slate has special handling for length 1 blocks
    return block.text.length > 1
  }
  return false
}

export function handleKeyDownLevel1(event, change) {
  if (Hotkeys.isDeleteCharBackward(event)) {
    handleDeleteChar(event, change, 'deleteCharBackward')
    return true
  }

  if (Hotkeys.isDeleteCharForward(event)) {
    handleDeleteChar(event, change, 'deleteCharForward')
    return true
  }
  return false
}

