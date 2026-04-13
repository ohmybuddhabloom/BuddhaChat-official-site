import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SunyataEditor from './SunyataEditor.jsx'
import { createSceneSnapshot } from '../../content/sunyata.js'

vi.mock('../../lib/journalAssetStore.js', () => ({
  resolveJournalImageSource: vi.fn(async (source) => ({
    src: source,
    revoke() {},
  })),
  saveJournalImageFile: vi.fn(async () => '/editor-assets/uploaded-image.png'),
}))

function noop() {}

function renderEditor(overrides = {}) {
  const scene = createSceneSnapshot()
  const updateJournalItem = vi.fn()
  const updateVisual = vi.fn()
  const updateSectionOrder = vi.fn()
  const updateSectionVisibility = vi.fn()

  render(
    <SunyataEditor
      editorOpen
      onToggle={noop}
      scene={scene}
      updateNavLogo={noop}
      updateNavLink={noop}
      updateHero={noop}
      updateInterlude={noop}
      updateBuddha={noop}
      updateCard={noop}
      updateJournal={noop}
      updateJournalLink={noop}
      updateJournalTheme={noop}
      updateJournalItem={updateJournalItem}
      updateVisual={updateVisual}
      updateQuote={noop}
      updateFooter={noop}
      updateSectionOrder={updateSectionOrder}
      updateSectionVisibility={updateSectionVisibility}
      onReset={noop}
      {...overrides}
    />,
  )

  return {
    updateJournalItem,
    updateVisual,
    updateSectionOrder,
    updateSectionVisibility,
  }
}

describe('SunyataEditor', () => {
  it('shows section structure controls, expanded journal controls, and quote position controls', () => {
    renderEditor()

    expect(screen.getByLabelText('期刊遮罩颜色')).toBeInTheDocument()
    expect(screen.getByLabelText('期刊背景透明度')).toBeInTheDocument()
    expect(screen.getByLabelText('背景图透明度')).toBeInTheDocument()
    expect(screen.getByLabelText('左侧遮罩强度')).toBeInTheDocument()
    expect(screen.getByLabelText('底部遮罩强度')).toBeInTheDocument()
    expect(screen.getByLabelText('正文最大宽度')).toBeInTheDocument()
    expect(screen.getByLabelText('卡片宽度')).toBeInTheDocument()
    expect(screen.getByLabelText('卡片高度')).toBeInTheDocument()
    expect(screen.getByLabelText('引文 X')).toBeInTheDocument()
    expect(screen.getByLabelText('引文 Y')).toBeInTheDocument()
    expect(screen.getAllByText(/期刊卡片 \d/)).toHaveLength(3)
    expect(screen.getByRole('button', { name: '上移 对话页' })).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: '显示 第三屏期刊' }),
    ).toBeChecked()
  })

  it('updates section visibility and order from the layout controls', () => {
    const { updateSectionOrder, updateSectionVisibility } = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: '下移 第一屏首屏' }))
    expect(updateSectionOrder).toHaveBeenCalledWith('hero', 'down')

    fireEvent.click(screen.getByRole('checkbox', { name: '显示 三张卡片' }))
    expect(updateSectionVisibility).toHaveBeenCalledWith('cards', false)
  })

  it('stores an uploaded foreground image as a project asset path', async () => {
    const { updateJournalItem } = renderEditor()
    const input = screen.getByLabelText('卡片 1 前景图 上传')
    const file = new File(['foreground'], 'foreground.png', { type: 'image/png' })

    fireEvent.change(input, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(updateJournalItem).toHaveBeenCalledWith(
        0,
        'cardUrl',
        '/editor-assets/uploaded-image.png',
      )
    })
  })

  it('stores an uploaded background image as a project asset path', async () => {
    const { updateJournalItem } = renderEditor()
    const input = screen.getByLabelText('卡片 2 背景图 上传')
    const file = new File(['background'], 'background.jpg', {
      type: 'image/jpeg',
    })

    fireEvent.change(input, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(updateJournalItem).toHaveBeenCalledWith(
        1,
        'backgroundUrl',
        '/editor-assets/uploaded-image.png',
      )
    })
  })

  it('stores an uploaded visual image as a project asset path', async () => {
    const { updateVisual } = renderEditor()
    const input = screen.getByLabelText('视觉图地址 上传')
    const file = new File(['visual'], 'visual.png', { type: 'image/png' })

    fireEvent.change(input, {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(updateVisual).toHaveBeenCalledWith(
        'imageSrc',
        '/editor-assets/uploaded-image.png',
      )
    })
  })
})
