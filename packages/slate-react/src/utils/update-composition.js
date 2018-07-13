/* 
 * Replaces the entire leaf instead of just the composition
 * replacing just a composition requires the target range
 * which isn't available until input events level 2
 */
const updateComposition = (change) => {
    const { value } = change

    // Get the selection point.
    const native = window.getSelection()
    const { anchorNode } = native
    const point = findPoint(anchorNode, 0, value)
    if (!point) return

    // Get the text node and leaf in question.
    const { document, selection } = value
    const node = document.getDescendant(point.key)
    const block = document.getClosestBlock(node.key)
    const leaves = node.getLeaves()
    const lastText = block.getLastText()
    const lastLeaf = leaves.last()
    let start = 0
    let end = 0

    const leaf =
      leaves.find(r => {
        start = end
        end += r.text.length
        if (end > point.offset) return true
      }) || lastLeaf

    
    // Get the text information.
    const { text } = leaf
    let { textContent } = anchorNode
    const isLastText = node == lastText
    const isLastLeaf = leaf == lastLeaf
    const lastChar = textContent.charAt(textContent.length - 1)

    // COMPAT: If this is the last leaf, and the DOM text ends in a new line,
    // we will have added another new line in <Leaf>'s render method to account
    // for browsers collapsing a single trailing new lines, so remove it.
    if (isLastText && isLastLeaf && lastChar == '\n') {
      textContent = textContent.slice(0, -1)
    }

    // If the text is no different, abort.
    if (textContent == text) return

    // Determine what the selection should be after changing the text.
    const delta = textContent.length - text.length
    const corrected = selection.collapseToEnd().move(delta)
    const entire = selection
      .moveAnchorTo(point.key, start)
      .moveFocusTo(point.key, end)

    // Change the current value to have the leaf's text replaced.
      change
        .insertTextAtRange(entire, textContent, leaf.marks)
        .select(corrected)
}

export default updateComposition