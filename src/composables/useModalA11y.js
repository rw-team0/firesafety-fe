import { nextTick, onBeforeUnmount, unref, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

export function useModalA11y({ visible, containerRef, onClose }) {
  let previousFocusedElement = null
  let listening = false

  const restoreFocus = () => {
    if (previousFocusedElement && document.contains(previousFocusedElement)) {
      previousFocusedElement.focus()
    }
    previousFocusedElement = null
  }

  const focusModal = async () => {
    await nextTick()
    const container = containerRef.value
    if (!container) return

    const [firstFocusable] = getFocusableElements(container)
    ;(firstFocusable || container).focus()
  }

  const handleKeydown = (event) => {
    if (!unref(visible)) return

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
      return
    }

    if (event.key !== 'Tab') return

    const container = containerRef.value
    const focusableElements = getFocusableElements(container)

    if (!container || !focusableElements.length) {
      event.preventDefault()
      container?.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement

    if (!container.contains(activeElement)) {
      event.preventDefault()
      firstElement.focus()
    } else if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  const addListener = () => {
    if (listening) return
    document.addEventListener('keydown', handleKeydown)
    listening = true
  }

  const removeListener = () => {
    if (!listening) return
    document.removeEventListener('keydown', handleKeydown)
    listening = false
  }

  watch(
    () => unref(visible),
    (isVisible) => {
      if (isVisible) {
        previousFocusedElement = document.activeElement
        addListener()
        focusModal()
      } else {
        removeListener()
        restoreFocus()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    removeListener()
    restoreFocus()
  })
}
