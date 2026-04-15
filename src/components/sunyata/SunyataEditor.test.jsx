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
  const updateNavLogo = vi.fn()
  const updateNavLink = vi.fn()
  const updateHero = vi.fn()
  const updateInterlude = vi.fn()
  const updateBuddha = vi.fn()
  const updateCard = vi.fn()
  const updateAppShowcase = vi.fn()
  const updateAppShowcasePhone = vi.fn()
  const updateJournal = vi.fn()
  const updateJournalLink = vi.fn()
  const updateJournalTheme = vi.fn()
  const updateJournalItem = vi.fn()
  const updateVisual = vi.fn()
  const updateQuote = vi.fn()
  const updateDonation = vi.fn()
  const updateDonationLayout = vi.fn()
  const updateDonationTier = vi.fn()
  const updateDonationGalleryItem = vi.fn()
  const updateFooter = vi.fn()
  const updateSectionOrder = vi.fn()
  const updateSectionVisibility = vi.fn()
  const onReset = vi.fn()
  const onResponsiveProfileChange = vi.fn()

  render(
    <SunyataEditor
      editorOpen
      onToggle={noop}
      responsiveProfile="desktop"
      onResponsiveProfileChange={onResponsiveProfileChange}
      scene={scene}
      updateNavLogo={updateNavLogo}
      updateNavLink={updateNavLink}
      updateHero={updateHero}
      updateInterlude={updateInterlude}
      updateBuddha={updateBuddha}
      updateCard={updateCard}
      updateAppShowcase={updateAppShowcase}
      updateAppShowcasePhone={updateAppShowcasePhone}
      updateJournal={updateJournal}
      updateJournalLink={updateJournalLink}
      updateJournalTheme={updateJournalTheme}
      updateJournalItem={updateJournalItem}
      updateVisual={updateVisual}
      updateQuote={updateQuote}
      updateDonation={updateDonation}
      updateDonationLayout={updateDonationLayout}
      updateDonationTier={updateDonationTier}
      updateDonationGalleryItem={updateDonationGalleryItem}
      updateFooter={updateFooter}
      updateSectionOrder={updateSectionOrder}
      updateSectionVisibility={updateSectionVisibility}
      onReset={onReset}
      {...overrides}
    />,
  )

  return {
    updateNavLogo,
    updateNavLink,
    updateHero,
    updateInterlude,
    updateBuddha,
    updateCard,
    updateAppShowcase,
    updateAppShowcasePhone,
    updateJournal,
    updateJournalLink,
    updateJournalTheme,
    updateJournalItem,
    updateVisual,
    updateQuote,
    updateDonation,
    updateDonationLayout,
    updateDonationTier,
    updateDonationGalleryItem,
    updateFooter,
    updateSectionOrder,
    updateSectionVisibility,
    onReset,
    onResponsiveProfileChange,
  }
}

describe('SunyataEditor', () => {
  it('restores the full editable panel with previous core controls and new content controls', () => {
    renderEditor()

    expect(screen.getByLabelText('品牌名称')).toBeInTheDocument()
    expect(screen.getByLabelText('首屏标题')).toBeInTheDocument()
    expect(screen.getByLabelText('佛像大小')).toBeInTheDocument()
    expect(screen.getByLabelText('期刊遮罩颜色')).toBeInTheDocument()
    expect(screen.getAllByLabelText('卡片 1 标题')).toHaveLength(2)
    expect(screen.getByLabelText('视觉图地址')).toBeInTheDocument()
    expect(screen.getByLabelText('视觉图左右（%）')).toBeInTheDocument()
    expect(screen.getByLabelText('佛像羽化强度')).toBeInTheDocument()
    expect(screen.getByLabelText('固定回复内容')).toBeInTheDocument()
    expect(screen.getByLabelText('展示标题')).toBeInTheDocument()
    expect(screen.getByLabelText('手机 1 图片')).toBeInTheDocument()
    expect(screen.getByLabelText('捐助主标题')).toBeInTheDocument()
    expect(screen.getByLabelText('捐助导语')).toBeInTheDocument()
    expect(screen.getByLabelText('左栏宽度（%）')).toBeInTheDocument()
    expect(screen.getByLabelText('捐助图 1 图片')).toBeInTheDocument()
    expect(screen.getByLabelText('版权第一行')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上移 对话页' })).toBeInTheDocument()
  }, 15000)

  it('updates section visibility and order from the layout controls', () => {
    const { updateSectionOrder, updateSectionVisibility } = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: '下移 第一屏首屏' }))
    expect(updateSectionOrder).toHaveBeenCalledWith('hero', 'down')

    fireEvent.click(screen.getByRole('checkbox', { name: '显示 三张卡片' }))
    expect(updateSectionVisibility).toHaveBeenCalledWith('cards', false)
  })

  it('writes responsive profile-aware offsets for quote placement', () => {
    const { updateQuote } = renderEditor()

    fireEvent.change(screen.getByLabelText('引文 X（%）'), {
      target: { value: '6.5' },
    })

    expect(updateQuote).toHaveBeenCalledWith('xPercent', 6.5, true, 'desktop')
  })

  it('writes profile-aware horizontal offsets for the visual image', () => {
    const { updateVisual } = renderEditor()

    fireEvent.change(screen.getByLabelText('视觉图左右（%）'), {
      target: { value: '-8.5' },
    })

    expect(updateVisual).toHaveBeenCalledWith('imageX', -8.5, true, 'desktop')
  })

  it('updates donation copy fields', () => {
    const { updateDonation } = renderEditor()

    fireEvent.change(screen.getByLabelText('捐助导语'), {
      target: { value: 'A quieter payment copy.' },
    })

    expect(updateDonation).toHaveBeenCalledWith('note', 'A quieter payment copy.')
  })

  it('updates donation layout fields', () => {
    const { updateDonationLayout } = renderEditor()

    fireEvent.change(screen.getByLabelText('图卡圆角'), {
      target: { value: '32' },
    })

    expect(updateDonationLayout).toHaveBeenCalledWith('cardRadius', 32)
  })

  it('updates donation gallery content fields', () => {
    const { updateDonationGalleryItem } = renderEditor()

    fireEvent.change(screen.getByLabelText('捐助图 1 标题'), {
      target: { value: 'Golden Mala' },
    })

    expect(updateDonationGalleryItem).toHaveBeenCalledWith(0, 'title', 'Golden Mala')
  })

  it('stores an uploaded journal image as a project asset path', async () => {
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

  it('shows a story mapping selector for each journal card and updates the slug', () => {
    const { updateJournalItem } = renderEditor()

    const selectors = screen.getAllByTestId('journal-story-slug-select')
    expect(selectors).toHaveLength(3)

    fireEvent.change(selectors[0], {
      target: { value: 'a-life-in-thangka' },
    })

    expect(updateJournalItem).toHaveBeenCalledWith(0, 'slug', 'a-life-in-thangka')
  })
})
