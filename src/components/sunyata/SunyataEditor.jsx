import { useEffect, useId, useState } from 'react'
import { SACRED_STORIES } from '../../content/sacredStories.js'
import {
  resolveJournalImageSource,
  saveJournalImageFile,
} from '../../lib/journalAssetStore.js'
import {
  DEFAULT_RESPONSIVE_PROFILE,
  getProfiledFieldValue,
  MOBILE_LARGE_RESPONSIVE_PROFILE,
  MOBILE_MEDIUM_RESPONSIVE_PROFILE,
  MOBILE_SMALL_RESPONSIVE_PROFILE,
} from '../../lib/responsiveOffsets.js'

const SECTION_LABELS = {
  hero: '第一屏首屏',
  interlude: '对话页',
  journal: '第三屏期刊',
  cards: '三张卡片',
  visual: '视觉图与引文',
  footer: '页脚',
  archive: '底部档案馆',
}

const PROFILE_LABELS = {
  [DEFAULT_RESPONSIVE_PROFILE]: '桌面',
  [MOBILE_SMALL_RESPONSIVE_PROFILE]: '手机小屏',
  [MOBILE_MEDIUM_RESPONSIVE_PROFILE]: '手机标准',
  [MOBILE_LARGE_RESPONSIVE_PROFILE]: '手机大屏',
}

function TextField({ label, value, onChange, multiline = false }) {
  const Element = multiline ? 'textarea' : 'input'

  return (
    <div className="editor-field">
      <label className="editor-label">
        <span>{label}</span>
        <Element
          className="editor-input"
          type={multiline ? undefined : 'text'}
          value={value}
          rows={multiline ? 4 : undefined}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
      </label>
    </div>
  )
}

function NumberField({ label, value, min, max, step = 1, onChange }) {
  const inputId = useId()

  return (
    <div className="editor-field">
      <label className="editor-label" htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <div className="editor-range-row">
        <input
          id={inputId}
          className="editor-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
        />
        <input
          className="editor-number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={`${label} 数值`}
        />
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="editor-field">
      <label className="editor-label">
        <span>{label}</span>
        <div className="editor-color-row">
          <input
            className="editor-color"
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
          />
          <input
            className="editor-input"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label} 十六进制`}
          />
        </div>
      </label>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  testId,
}) {
  const inputId = useId()

  return (
    <div className="editor-field">
      <label className="editor-label" htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <select
        id={inputId}
        className="editor-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        data-testid={testId}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function EditorSection({ title, children }) {
  return (
    <details className="editor-section" open>
      <summary>{title}</summary>
      <div className="editor-section-body">{children}</div>
    </details>
  )
}

function LayoutRow({
  id,
  label,
  visible,
  isFirst,
  isLast,
  onMove,
  onToggle,
}) {
  return (
    <div className="editor-layout-row">
      <label className="editor-layout-toggle">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => onToggle(id, event.target.checked)}
          aria-label={`显示 ${label}`}
        />
        <span>{label}</span>
      </label>

      <div className="editor-layout-actions">
        <button
          type="button"
          className="editor-mini-button"
          onClick={() => onMove(id, 'up')}
          disabled={isFirst}
          aria-label={`上移 ${label}`}
        >
          上移
        </button>
        <button
          type="button"
          className="editor-mini-button"
          onClick={() => onMove(id, 'down')}
          disabled={isLast}
          aria-label={`下移 ${label}`}
        >
          下移
        </button>
      </div>
    </div>
  )
}

function ToggleField({ label, checked, onChange }) {
  return (
    <div className="editor-field">
      <label className="editor-layout-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <span>{label}</span>
      </label>
    </div>
  )
}

function ImageField({ label, value, onChange }) {
  const inputId = useId()
  const [previewSrc, setPreviewSrc] = useState(value || '')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let active = true
    let revoke = () => {}

    const hydratePreview = async () => {
      const resolved = await resolveJournalImageSource(value)

      if (!active) {
        resolved.revoke()
        return
      }

      revoke = resolved.revoke
      setPreviewSrc(resolved.src)
    }

    hydratePreview()

    return () => {
      active = false
      revoke()
    }
  }, [value])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploading(true)

    try {
      const uploadedPath = await saveJournalImageFile(file)
      onChange(uploadedPath)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="editor-field">
      <label className="editor-label">
        <span>{label}</span>
        <input
          className="editor-input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
      </label>
      <div className="editor-inline-actions">
        <label className="editor-upload-button" htmlFor={inputId}>
          {uploading ? '上传中…' : '上传图片'}
        </label>
        <input
          id={inputId}
          className="editor-hidden-input"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          aria-label={`${label} 上传`}
        />
      </div>
      {previewSrc ? (
        <img className="editor-image-preview" src={previewSrc} alt="" />
      ) : null}
    </div>
  )
}

function SunyataEditor({
  editorOpen,
  onToggle,
  responsiveProfile,
  onResponsiveProfileChange,
  scene,
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
}) {
  const getResponsiveValue = (section, field, fallback = 0) =>
    getProfiledFieldValue(section, field, responsiveProfile) ?? fallback

  return (
    <>
      <button
        type="button"
        className="sunyata-editor-toggle"
        onClick={onToggle}
        aria-label={editorOpen ? '关闭编辑器' : '打开编辑器'}
      >
        {editorOpen ? '关闭编辑器' : '打开编辑器'}
      </button>

      {editorOpen ? (
        <aside className="sunyata-editor" aria-label="页面编辑器">
          <div className="editor-header">
            <div>
              <p className="editor-kicker">实时编辑</p>
              <h2>页面编辑器</h2>
              <p className="editor-note">
                当前编辑的是 {PROFILE_LABELS[responsiveProfile]} 的文案、位置、图片和入口内容。
              </p>
            </div>

            <div className="editor-inline-actions">
              {Object.entries(PROFILE_LABELS).map(([profile, label]) => (
                <button
                  key={profile}
                  type="button"
                  className="editor-mini-button"
                  aria-pressed={responsiveProfile === profile}
                  onClick={() => onResponsiveProfileChange(profile)}
                >
                  {label}
                </button>
              ))}
              <button type="button" className="editor-ghost-button" onClick={onReset}>
                重置默认
              </button>
            </div>
          </div>

          <EditorSection title="页面结构">
            {scene.layout.sections.map((section, index) => (
              <LayoutRow
                key={section.id}
                id={section.id}
                label={SECTION_LABELS[section.id] ?? section.id}
                visible={section.visible}
                isFirst={index === 0}
                isLast={index === scene.layout.sections.length - 1}
                onMove={updateSectionOrder}
                onToggle={updateSectionVisibility}
              />
            ))}
          </EditorSection>

          <EditorSection title="导航">
            <TextField label="品牌名称" value={scene.nav.logo} onChange={updateNavLogo} />
            {scene.nav.links.map((link, index) => (
              <TextField
                key={link.href}
                label={`导航链接 ${index + 1}`}
                value={link.label}
                onChange={(value) => updateNavLink(index, value)}
              />
            ))}
          </EditorSection>

          <EditorSection title="首屏">
            <TextField
              label="首屏标题"
              value={scene.hero.title}
              onChange={(value) => updateHero('title', value)}
            />
            <TextField
              label="首屏副标题"
              value={scene.hero.subtitle}
              multiline
              onChange={(value) => updateHero('subtitle', value)}
            />
            <TextField
              label="滚动提示"
              value={scene.hero.scrollLabel}
              onChange={(value) => updateHero('scrollLabel', value)}
            />
            <NumberField
              label="首屏文案 X（%）"
              min={-30}
              max={30}
              step={0.1}
              value={getResponsiveValue(scene.hero, 'copyXPercent')}
              onChange={(value) => updateHero('copyXPercent', value, true, responsiveProfile)}
            />
            <NumberField
              label="首屏文案 Y（%）"
              min={-30}
              max={30}
              step={0.1}
              value={getResponsiveValue(scene.hero, 'copyYPercent')}
              onChange={(value) => updateHero('copyYPercent', value, true, responsiveProfile)}
            />
            <NumberField
              label="首屏文案宽度"
              min={25}
              max={100}
              value={getResponsiveValue(scene.hero, 'leftWidth', scene.hero.leftWidth)}
              onChange={(value) => updateHero('leftWidth', value, true, responsiveProfile)}
            />
            <NumberField
              label="首屏左边距"
              min={0}
              max={20}
              value={getResponsiveValue(scene.hero, 'leftPadding', scene.hero.leftPadding)}
              onChange={(value) => updateHero('leftPadding', value, true, responsiveProfile)}
            />
          </EditorSection>

          <EditorSection title="对话页">
            <TextField
              label="对话前缀"
              value={scene.interlude.kicker}
              onChange={(value) => updateInterlude('kicker', value)}
            />
            <TextField
              label="对话标题"
              value={scene.interlude.title}
              onChange={(value) => updateInterlude('title', value)}
            />
            <TextField
              label="对话说明"
              value={scene.interlude.note}
              multiline
              onChange={(value) => updateInterlude('note', value)}
            />
            <TextField
              label="输入框提示"
              value={scene.interlude.placeholder}
              onChange={(value) => updateInterlude('placeholder', value)}
            />
            <TextField
              label="按钮文案"
              value={scene.interlude.actionLabel}
              onChange={(value) => updateInterlude('actionLabel', value)}
            />
            <TextField
              label="固定回复标签"
              value={scene.interlude.responseLabel}
              onChange={(value) => updateInterlude('responseLabel', value)}
            />
            <TextField
              label="固定回复内容"
              value={scene.interlude.responseText}
              multiline
              onChange={(value) => updateInterlude('responseText', value)}
            />
            <NumberField
              label="对话文案 X（%）"
              min={-30}
              max={30}
              step={0.1}
              value={getResponsiveValue(scene.interlude, 'textXPercent')}
              onChange={(value) => updateInterlude('textXPercent', value, true, responsiveProfile)}
            />
            <NumberField
              label="对话文案 Y（%）"
              min={-30}
              max={30}
              step={0.1}
              value={getResponsiveValue(scene.interlude, 'textYPercent')}
              onChange={(value) => updateInterlude('textYPercent', value, true, responsiveProfile)}
            />
            <NumberField
              label="输入框 X（%）"
              min={-30}
              max={30}
              step={0.1}
              value={getResponsiveValue(scene.interlude, 'chatXPercent')}
              onChange={(value) => updateInterlude('chatXPercent', value, true, responsiveProfile)}
            />
            <NumberField
              label="输入框 Y（%）"
              min={-30}
              max={30}
              step={0.1}
              value={getResponsiveValue(scene.interlude, 'chatYPercent')}
              onChange={(value) => updateInterlude('chatYPercent', value, true, responsiveProfile)}
            />
            <NumberField
              label="浣涚鍥炲 X"
              min={-180}
              max={180}
              value={scene.interlude.replyX ?? 0}
              onChange={(value) => updateInterlude('replyX', value)}
            />
            <NumberField
              label="浣涚鍥炲 Y"
              min={-180}
              max={180}
              value={scene.interlude.replyY ?? 0}
              onChange={(value) => updateInterlude('replyY', value)}
            />
          </EditorSection>

          <EditorSection title="佛像视频">
            <NumberField label="佛像 X" min={-220} max={220} value={scene.buddha.x} onChange={(value) => updateBuddha('x', value)} />
            <NumberField label="佛像 Y" min={-220} max={220} value={scene.buddha.y} onChange={(value) => updateBuddha('y', value)} />
            <NumberField label="佛像移动 Y" min={0} max={420} value={scene.buddha.travelY} onChange={(value) => updateBuddha('travelY', value)} />
            <NumberField label="佛像大小" min={80} max={180} value={scene.buddha.scale} onChange={(value) => updateBuddha('scale', value)} />
            <NumberField label="佛像羽化范围" min={60} max={110} value={scene.buddha.featherRange} onChange={(value) => updateBuddha('featherRange', value)} />
            <NumberField label="佛像羽化强度" min={10} max={100} value={scene.buddha.featherStrength} onChange={(value) => updateBuddha('featherStrength', value)} />
            <NumberField label="停止屏幕高度" min={20} max={200} value={scene.buddha.stopViewportY} onChange={(value) => updateBuddha('stopViewportY', value)} />
          </EditorSection>

          <EditorSection title="App 展示区">
            <TextField label="展示前缀" value={scene.appShowcase.kicker} onChange={(value) => updateAppShowcase('kicker', value)} />
            <TextField label="展示标题" value={scene.appShowcase.title} onChange={(value) => updateAppShowcase('title', value)} />
            <TextField label="左侧说明" value={scene.appShowcase.lead} multiline onChange={(value) => updateAppShowcase('lead', value)} />
            <TextField label="主按钮文案" value={scene.appShowcase.primaryActionLabel} onChange={(value) => updateAppShowcase('primaryActionLabel', value)} />
            <TextField label="次按钮文案" value={scene.appShowcase.secondaryActionLabel} onChange={(value) => updateAppShowcase('secondaryActionLabel', value)} />
            <TextField label="社群文案" value={scene.appShowcase.proofText} onChange={(value) => updateAppShowcase('proofText', value)} />
            {scene.appShowcase.phones.map((phone, index) => (
              <div className="editor-subgroup" key={`${phone.key}-${index}`}>
                <h3>{`手机 ${index + 1}`}</h3>
                <ImageField label={`手机 ${index + 1} 图片`} value={phone.imageSrc} onChange={(value) => updateAppShowcasePhone(index, 'imageSrc', value)} />
                <TextField label={`手机 ${index + 1} 替代文本`} value={phone.imageAlt} onChange={(value) => updateAppShowcasePhone(index, 'imageAlt', value)} />
              </div>
            ))}
          </EditorSection>

          <EditorSection title="期刊页">
            <TextField label="刊号" value={scene.journal.edition} onChange={(value) => updateJournal('edition', value)} />
            <TextField label="品牌名" value={scene.journal.brand} onChange={(value) => updateJournal('brand', value)} />
            <TextField label="主按钮文案" value={scene.journal.actionLabel} onChange={(value) => updateJournal('actionLabel', value)} />
            <NumberField label="期刊文字 X（%）" min={-30} max={30} step={0.1} value={getResponsiveValue(scene.journal, 'textXPercent')} onChange={(value) => updateJournal('textXPercent', value, true, responsiveProfile)} />
            <NumberField label="期刊文字 Y（%）" min={-30} max={30} step={0.1} value={getResponsiveValue(scene.journal, 'textYPercent')} onChange={(value) => updateJournal('textYPercent', value, true, responsiveProfile)} />
            <NumberField label="期刊图片 X（%）" min={-30} max={30} step={0.1} value={getResponsiveValue(scene.journal, 'imageXPercent')} onChange={(value) => updateJournal('imageXPercent', value, true, responsiveProfile)} />
            <NumberField label="期刊图片 Y（%）" min={-30} max={30} step={0.1} value={getResponsiveValue(scene.journal, 'imageYPercent')} onChange={(value) => updateJournal('imageYPercent', value, true, responsiveProfile)} />

            <div className="editor-subgroup">
              <h3>顶部链接</h3>
              {scene.journal.links.map((link, index) => (
                <TextField
                  key={`${link}-${index}`}
                  label={`期刊链接 ${index + 1}`}
                  value={link}
                  onChange={(value) => updateJournalLink(index, value)}
                />
              ))}
            </div>

            <div className="editor-subgroup">
              <h3>背景与色调</h3>
              <ColorField label="期刊背景颜色" value={scene.journal.theme.base} onChange={(value) => updateJournalTheme('base', value)} />
              <ColorField label="期刊遮罩颜色" value={scene.journal.theme.overlayColor ?? scene.journal.theme.base} onChange={(value) => updateJournalTheme('overlayColor', value)} />
              <NumberField label="期刊背景透明度" min={0} max={100} value={scene.journal.theme.overlayOpacity ?? 72} onChange={(value) => updateJournalTheme('overlayOpacity', value)} />
              <NumberField label="主卡亮度" min={70} max={140} value={scene.journal.theme.leadBrightness ?? 104} onChange={(value) => updateJournalTheme('leadBrightness', value)} />
              <NumberField label="背景图透明度" min={0} max={100} value={scene.journal.theme.imageOpacity ?? 34} onChange={(value) => updateJournalTheme('imageOpacity', value)} />
              <NumberField label="左侧遮罩强度" min={0} max={100} value={scene.journal.theme.leftVeilOpacity ?? 98} onChange={(value) => updateJournalTheme('leftVeilOpacity', value)} />
              <NumberField label="底部遮罩强度" min={0} max={100} value={scene.journal.theme.bottomVeilOpacity ?? 84} onChange={(value) => updateJournalTheme('bottomVeilOpacity', value)} />
              <NumberField label="环境光强度" min={0} max={100} value={scene.journal.theme.ambientGlowOpacity ?? 16} onChange={(value) => updateJournalTheme('ambientGlowOpacity', value)} />
              <ColorField label="点金色" value={scene.journal.theme.accent} onChange={(value) => updateJournalTheme('accent', value)} />
              <ColorField label="文字色" value={scene.journal.theme.text} onChange={(value) => updateJournalTheme('text', value)} />
            </div>

            <div className="editor-subgroup">
              <h3>版式与尺寸</h3>
              <NumberField label="正文最大宽度" min={360} max={760} value={scene.journal.theme.copyMaxWidth ?? 560} onChange={(value) => updateJournalTheme('copyMaxWidth', value)} />
              <NumberField label="卡片宽度" min={240} max={420} value={scene.journal.theme.cardWidth ?? 340} onChange={(value) => updateJournalTheme('cardWidth', value)} />
              <NumberField label="卡片高度" min={320} max={560} value={scene.journal.theme.cardHeight ?? 460} onChange={(value) => updateJournalTheme('cardHeight', value)} />
            </div>

            {scene.journal.items.map((item, index) => (
              <div className="editor-subgroup" key={`${item.title}-${index}`}>
                <SelectField
                  label={`Story link ${index + 1}`}
                  value={item.slug}
                  options={SACRED_STORIES.map((story) => ({
                    value: story.slug,
                    label: `${story.shortTitle} (${story.slug})`,
                  }))}
                  onChange={(value) => updateJournalItem(index, 'slug', value)}
                  testId="journal-story-slug-select"
                />
                <h3>{`期刊卡片 ${index + 1}`}</h3>
                <TextField label={`卡片 ${index + 1} 标签`} value={item.tag} onChange={(value) => updateJournalItem(index, 'tag', value)} />
                <TextField label={`卡片 ${index + 1} 标题`} value={item.title} onChange={(value) => updateJournalItem(index, 'title', value)} />
                <TextField label={`卡片 ${index + 1} 描述`} value={item.description} multiline onChange={(value) => updateJournalItem(index, 'description', value)} />
                <ImageField label={`卡片 ${index + 1} 前景图`} value={item.cardUrl} onChange={(value) => updateJournalItem(index, 'cardUrl', value)} />
                <ImageField label={`卡片 ${index + 1} 背景图`} value={item.backgroundUrl} onChange={(value) => updateJournalItem(index, 'backgroundUrl', value)} />
              </div>
            ))}
          </EditorSection>

          <EditorSection title="三张卡片">
            {scene.cards.map((card, index) => (
              <div className="editor-subgroup" key={`${card.number}-${index}`}>
                <h3>{`卡片 ${index + 1}`}</h3>
                <TextField label={`卡片 ${index + 1} 编号`} value={card.number} onChange={(value) => updateCard(index, 'number', value)} />
                <TextField label={`卡片 ${index + 1} 标题`} value={card.title} onChange={(value) => updateCard(index, 'title', value)} />
                <TextField label={`卡片 ${index + 1} 描述`} value={card.description} multiline onChange={(value) => updateCard(index, 'description', value)} />
                <NumberField label={`卡片 ${index + 1} Y 偏移`} min={-40} max={180} value={card.offsetY} onChange={(value) => updateCard(index, 'offsetY', value)} />
              </div>
            ))}
          </EditorSection>

          <EditorSection title="视觉图">
            <TextField label="背景大字" value={scene.visual.ghostLabel} onChange={(value) => updateVisual('ghostLabel', value)} />
            <ImageField label="视觉图地址" value={scene.visual.imageSrc} onChange={(value) => updateVisual('imageSrc', value)} />
            <TextField label="视觉图替代文本" value={scene.visual.imageAlt} onChange={(value) => updateVisual('imageAlt', value)} />
            <NumberField label="视觉图宽度" min={30} max={95} value={getProfiledFieldValue(scene.visual, 'imageWidth', responsiveProfile) ?? scene.visual.imageWidth} onChange={(value) => updateVisual('imageWidth', value, true, responsiveProfile)} />
            <NumberField label="视觉图左右（%）" min={-30} max={30} step={0.1} value={getProfiledFieldValue(scene.visual, 'imageX', responsiveProfile) ?? scene.visual.imageX ?? 0} onChange={(value) => updateVisual('imageX', value, true, responsiveProfile)} />
            <NumberField label="背景大字右侧" min={-20} max={20} value={getProfiledFieldValue(scene.visual, 'ghostRight', responsiveProfile) ?? scene.visual.ghostRight} onChange={(value) => updateVisual('ghostRight', value, true, responsiveProfile)} />
            <NumberField label="背景大字底部" min={-10} max={30} value={getProfiledFieldValue(scene.visual, 'ghostBottom', responsiveProfile) ?? scene.visual.ghostBottom} onChange={(value) => updateVisual('ghostBottom', value, true, responsiveProfile)} />
          </EditorSection>

          <EditorSection title="引文与捐助">
            <ToggleField
              label="Show donation / commerce module"
              checked={Boolean(scene.donation.visible)}
              onChange={(value) => updateDonation('visible', value)}
            />
            <TextField label="引文文本" value={scene.quote.text} multiline onChange={(value) => updateQuote('text', value)} />
            <TextField label="工作室标签" value={scene.quote.studioLabel} onChange={(value) => updateQuote('studioLabel', value)} />
            <TextField label="工作室内容" value={scene.quote.studioText} onChange={(value) => updateQuote('studioText', value)} />
            <TextField label="理念标签" value={scene.quote.philosophyLabel} onChange={(value) => updateQuote('philosophyLabel', value)} />
            <TextField label="理念内容" value={scene.quote.philosophyText} multiline onChange={(value) => updateQuote('philosophyText', value)} />
            <NumberField label="引文宽度" min={240} max={1100} value={getResponsiveValue(scene.quote, 'maxWidth', scene.quote.maxWidth)} onChange={(value) => updateQuote('maxWidth', value, true, responsiveProfile)} />
            <NumberField label="引文 X（%）" min={-40} max={40} step={0.1} value={getResponsiveValue(scene.quote, 'xPercent')} onChange={(value) => updateQuote('xPercent', value, true, responsiveProfile)} />
            <NumberField label="引文 Y（%）" min={-40} max={40} step={0.1} value={getResponsiveValue(scene.quote, 'yPercent')} onChange={(value) => updateQuote('yPercent', value, true, responsiveProfile)} />
            <TextField label="捐助眉标" value={scene.donation.eyebrow} onChange={(value) => updateDonation('eyebrow', value)} />
            <TextField label="捐助主标题" value={scene.donation.heading} onChange={(value) => updateDonation('heading', value)} />
            <TextField label="捐助前缀" value={scene.donation.kicker} onChange={(value) => updateDonation('kicker', value)} />
            <TextField label="捐助导语" value={scene.donation.note} multiline onChange={(value) => updateDonation('note', value)} />
            <TextField label="表单说明" value={scene.donation.panelNote} multiline onChange={(value) => updateDonation('panelNote', value)} />
            <TextField label="捐助邮箱占位" value={scene.donation.emailPlaceholder} onChange={(value) => updateDonation('emailPlaceholder', value)} />
            <TextField label="自定义金额占位" value={scene.donation.customPlaceholder} onChange={(value) => updateDonation('customPlaceholder', value)} />
            <TextField label="捐助按钮文案" value={scene.donation.actionLabel} onChange={(value) => updateDonation('actionLabel', value)} />
            <TextField label="捐助成功提示" value={scene.donation.successMessage} onChange={(value) => updateDonation('successMessage', value)} />
            <TextField label="底部支持说明" value={scene.donation.supportNote} multiline onChange={(value) => updateDonation('supportNote', value)} />
            <NumberField label="左栏宽度（%）" min={24} max={52} value={scene.donation.layout.copyWidthPercent} onChange={(value) => updateDonationLayout('copyWidthPercent', value)} />
            <NumberField label="模块上边距" min={24} max={180} value={scene.donation.layout.topSpacing} onChange={(value) => updateDonationLayout('topSpacing', value)} />
            <NumberField label="模块间距" min={12} max={96} value={scene.donation.layout.gap} onChange={(value) => updateDonationLayout('gap', value)} />
            <NumberField label="图卡圆角" min={0} max={48} value={scene.donation.layout.cardRadius} onChange={(value) => updateDonationLayout('cardRadius', value)} />
            {scene.donation.tiers.map((tier, index) => (
              <div className="editor-subgroup" key={`${tier.amount}-${index}`}>
                <h3>{`捐助档位 ${index + 1}`}</h3>
                <TextField label={`金额 ${index + 1} 数值`} value={tier.amount} onChange={(value) => updateDonationTier(index, 'amount', value)} />
                <TextField label={`金额 ${index + 1} 展示`} value={tier.label} onChange={(value) => updateDonationTier(index, 'label', value)} />
                <TextField label={`金额 ${index + 1} 描述`} value={tier.description} onChange={(value) => updateDonationTier(index, 'description', value)} />
              </div>
            ))}
            {scene.donation.gallery.map((item, index) => (
              <div className="editor-subgroup" key={`${item.title}-${index}`}>
                <h3>{`捐助图 ${index + 1}`}</h3>
                <TextField label={`捐助图 ${index + 1} 标题`} value={item.title} onChange={(value) => updateDonationGalleryItem(index, 'title', value)} />
                <TextField label={`捐助图 ${index + 1} 说明`} value={item.note} onChange={(value) => updateDonationGalleryItem(index, 'note', value)} />
                <TextField label={`捐助图 ${index + 1} 悬浮文案`} value={item.overlay} onChange={(value) => updateDonationGalleryItem(index, 'overlay', value)} />
                <ImageField label={`捐助图 ${index + 1} 图片`} value={item.imageSrc} onChange={(value) => updateDonationGalleryItem(index, 'imageSrc', value)} />
                <TextField label={`捐助图 ${index + 1} 替代文本`} value={item.imageAlt} onChange={(value) => updateDonationGalleryItem(index, 'imageAlt', value)} />
              </div>
            ))}
          </EditorSection>

          <EditorSection title="页脚">
            <TextField label="页脚第一行" value={scene.footer.titleLine1} onChange={(value) => updateFooter('titleLine1', value)} />
            <TextField label="页脚第二行" value={scene.footer.titleLine2} onChange={(value) => updateFooter('titleLine2', value)} />
            <TextField label="页脚按钮" value={scene.footer.ctaLabel} onChange={(value) => updateFooter('ctaLabel', value)} />
            <TextField label="版权第一行" value={scene.footer.copyrightLine1} onChange={(value) => updateFooter('copyrightLine1', value)} />
            <TextField label="版权第二行" value={scene.footer.copyrightLine2} onChange={(value) => updateFooter('copyrightLine2', value)} />
          </EditorSection>
        </aside>
      ) : null}
    </>
  )
}

export default SunyataEditor
