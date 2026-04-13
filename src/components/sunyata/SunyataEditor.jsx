import { useEffect, useId, useState } from 'react'
import {
  resolveJournalImageSource,
  saveJournalImageFile,
} from '../../lib/journalAssetStore.js'

const SECTION_LABELS = {
  hero: '第一屏首屏',
  interlude: '对话页',
  journal: '第三屏期刊',
  cards: '三张卡片',
  visual: '视觉图与引文',
  footer: '页脚',
  archive: '底部档案馆',
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
  scene,
  updateNavLogo,
  updateNavLink,
  updateHero,
  updateInterlude,
  updateBuddha,
  updateCard,
  updateJournal,
  updateJournalLink,
  updateJournalTheme,
  updateJournalItem,
  updateVisual,
  updateQuote,
  updateFooter,
  updateSectionOrder,
  updateSectionVisibility,
  onReset,
}) {
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
        <aside
          className="sunyata-editor"
          aria-label="页面编辑器"
          role="complementary"
        >
          <div className="editor-header">
            <div>
              <p className="editor-kicker">实时编辑</p>
              <h2>页面编辑器</h2>
              <p className="editor-note">
                这里可以直接调整结构顺序、文案、位置、图片和颜色，右侧页面会实时同步。
              </p>
            </div>
            <button type="button" className="editor-ghost-button" onClick={onReset}>
              重置默认
            </button>
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
              label="首屏文案 X"
              min={-180}
              max={180}
              value={scene.hero.copyX}
              onChange={(value) => updateHero('copyX', value)}
            />
            <NumberField
              label="首屏文案 Y"
              min={-180}
              max={180}
              value={scene.hero.copyY}
              onChange={(value) => updateHero('copyY', value)}
            />
            <NumberField
              label="首屏文案宽度"
              min={25}
              max={60}
              value={scene.hero.leftWidth}
              onChange={(value) => updateHero('leftWidth', value)}
            />
            <NumberField
              label="首屏左边距"
              min={0}
              max={20}
              value={scene.hero.leftPadding}
              onChange={(value) => updateHero('leftPadding', value)}
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
              label="输入框按钮"
              value={scene.interlude.actionLabel}
              onChange={(value) => updateInterlude('actionLabel', value)}
            />
            <NumberField
              label="对话文字 X"
              min={-240}
              max={240}
              value={scene.interlude.textX ?? 0}
              onChange={(value) => updateInterlude('textX', value)}
            />
            <NumberField
              label="对话文字 Y"
              min={-240}
              max={240}
              value={scene.interlude.textY ?? 0}
              onChange={(value) => updateInterlude('textY', value)}
            />
            <NumberField
              label="对话框 X"
              min={-220}
              max={220}
              value={scene.interlude.chatX}
              onChange={(value) => updateInterlude('chatX', value)}
            />
            <NumberField
              label="对话框 Y"
              min={-220}
              max={220}
              value={scene.interlude.chatY}
              onChange={(value) => updateInterlude('chatY', value)}
            />
          </EditorSection>

          <EditorSection title="佛像视频">
            <NumberField
              label="佛像 X"
              min={-220}
              max={220}
              value={scene.buddha.x}
              onChange={(value) => updateBuddha('x', value)}
            />
            <NumberField
              label="佛像 Y"
              min={-220}
              max={220}
              value={scene.buddha.y}
              onChange={(value) => updateBuddha('y', value)}
            />
            <NumberField
              label="佛像移动 Y"
              min={0}
              max={420}
              value={scene.buddha.travelY}
              onChange={(value) => updateBuddha('travelY', value)}
            />
            <NumberField
              label="佛像大小"
              min={80}
              max={180}
              value={scene.buddha.scale}
              onChange={(value) => updateBuddha('scale', value)}
            />
            <NumberField
              label="羽化范围"
              min={60}
              max={110}
              value={scene.buddha.featherRange}
              onChange={(value) => updateBuddha('featherRange', value)}
            />
            <NumberField
              label="羽化强度"
              min={10}
              max={100}
              value={scene.buddha.featherStrength}
              onChange={(value) => updateBuddha('featherStrength', value)}
            />
            <NumberField
              label="停止屏幕高度"
              min={20}
              max={200}
              value={scene.buddha.stopViewportY}
              onChange={(value) => updateBuddha('stopViewportY', value)}
            />
          </EditorSection>

          <EditorSection title="期刊页">
            <TextField
              label="刊号"
              value={scene.journal.edition}
              onChange={(value) => updateJournal('edition', value)}
            />
            <TextField
              label="品牌名"
              value={scene.journal.brand}
              onChange={(value) => updateJournal('brand', value)}
            />
            <TextField
              label="主按钮文案"
              value={scene.journal.actionLabel}
              onChange={(value) => updateJournal('actionLabel', value)}
            />
            <NumberField
              label="期刊文字 X"
              min={-240}
              max={240}
              value={scene.journal.textX}
              onChange={(value) => updateJournal('textX', value)}
            />
            <NumberField
              label="期刊文字 Y"
              min={-240}
              max={240}
              value={scene.journal.textY}
              onChange={(value) => updateJournal('textY', value)}
            />
            <NumberField
              label="期刊图片 X"
              min={-240}
              max={240}
              value={scene.journal.imageX}
              onChange={(value) => updateJournal('imageX', value)}
            />
            <NumberField
              label="期刊图片 Y"
              min={-240}
              max={240}
              value={scene.journal.imageY}
              onChange={(value) => updateJournal('imageY', value)}
            />

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
              <ColorField
                label="期刊背景颜色"
                value={scene.journal.theme.base}
                onChange={(value) => updateJournalTheme('base', value)}
              />
              <ColorField
                label="期刊遮罩颜色"
                value={scene.journal.theme.overlayColor ?? scene.journal.theme.base}
                onChange={(value) => updateJournalTheme('overlayColor', value)}
              />
              <NumberField
                label="期刊背景透明度"
                min={0}
                max={100}
                value={scene.journal.theme.overlayOpacity ?? 72}
                onChange={(value) => updateJournalTheme('overlayOpacity', value)}
              />
              <NumberField
                label="主卡亮度"
                min={70}
                max={140}
                value={scene.journal.theme.leadBrightness ?? 104}
                onChange={(value) => updateJournalTheme('leadBrightness', value)}
              />
              <NumberField
                label="背景图透明度"
                min={0}
                max={100}
                value={scene.journal.theme.imageOpacity ?? 34}
                onChange={(value) => updateJournalTheme('imageOpacity', value)}
              />
              <NumberField
                label="左侧遮罩强度"
                min={0}
                max={100}
                value={scene.journal.theme.leftVeilOpacity ?? 98}
                onChange={(value) => updateJournalTheme('leftVeilOpacity', value)}
              />
              <NumberField
                label="底部遮罩强度"
                min={0}
                max={100}
                value={scene.journal.theme.bottomVeilOpacity ?? 84}
                onChange={(value) => updateJournalTheme('bottomVeilOpacity', value)}
              />
              <NumberField
                label="环境光强度"
                min={0}
                max={100}
                value={scene.journal.theme.ambientGlowOpacity ?? 16}
                onChange={(value) =>
                  updateJournalTheme('ambientGlowOpacity', value)
                }
              />
              <ColorField
                label="点金色"
                value={scene.journal.theme.accent}
                onChange={(value) => updateJournalTheme('accent', value)}
              />
              <ColorField
                label="文字色"
                value={scene.journal.theme.text}
                onChange={(value) => updateJournalTheme('text', value)}
              />
            </div>

            <div className="editor-subgroup">
              <h3>版式与尺寸</h3>
              <NumberField
                label="正文最大宽度"
                min={360}
                max={760}
                value={scene.journal.theme.copyMaxWidth ?? 560}
                onChange={(value) => updateJournalTheme('copyMaxWidth', value)}
              />
              <NumberField
                label="卡片宽度"
                min={240}
                max={420}
                value={scene.journal.theme.cardWidth ?? 340}
                onChange={(value) => updateJournalTheme('cardWidth', value)}
              />
              <NumberField
                label="卡片高度"
                min={320}
                max={560}
                value={scene.journal.theme.cardHeight ?? 460}
                onChange={(value) => updateJournalTheme('cardHeight', value)}
              />
            </div>

            {scene.journal.items.map((item, index) => (
              <div className="editor-subgroup" key={`${item.title}-${index}`}>
                <h3>{`期刊卡片 ${index + 1}`}</h3>
                <TextField
                  label={`卡片 ${index + 1} 标签`}
                  value={item.tag}
                  onChange={(value) => updateJournalItem(index, 'tag', value)}
                />
                <TextField
                  label={`卡片 ${index + 1} 标题`}
                  value={item.title}
                  onChange={(value) => updateJournalItem(index, 'title', value)}
                />
                <TextField
                  label={`卡片 ${index + 1} 描述`}
                  value={item.description}
                  multiline
                  onChange={(value) =>
                    updateJournalItem(index, 'description', value)
                  }
                />
                <ImageField
                  label={`卡片 ${index + 1} 前景图`}
                  value={item.cardUrl}
                  onChange={(value) => updateJournalItem(index, 'cardUrl', value)}
                />
                <ImageField
                  label={`卡片 ${index + 1} 背景图`}
                  value={item.backgroundUrl}
                  onChange={(value) =>
                    updateJournalItem(index, 'backgroundUrl', value)
                  }
                />
              </div>
            ))}
          </EditorSection>

          <EditorSection title="三张卡片">
            {scene.cards.map((card, index) => (
              <div className="editor-subgroup" key={`${card.number}-${index}`}>
                <h3>{`卡片 ${index + 1}`}</h3>
                <TextField
                  label={`卡片 ${index + 1} 编号`}
                  value={card.number}
                  onChange={(value) => updateCard(index, 'number', value)}
                />
                <TextField
                  label={`卡片 ${index + 1} 标题`}
                  value={card.title}
                  onChange={(value) => updateCard(index, 'title', value)}
                />
                <TextField
                  label={`卡片 ${index + 1} 描述`}
                  value={card.description}
                  multiline
                  onChange={(value) => updateCard(index, 'description', value)}
                />
                <NumberField
                  label={`卡片 ${index + 1} Y 偏移`}
                  min={-40}
                  max={180}
                  value={card.offsetY}
                  onChange={(value) => updateCard(index, 'offsetY', value)}
                />
              </div>
            ))}
          </EditorSection>

          <EditorSection title="视觉图">
            <TextField
              label="背景大字"
              value={scene.visual.ghostLabel}
              onChange={(value) => updateVisual('ghostLabel', value)}
            />
            <ImageField
              label="视觉图地址"
              value={scene.visual.imageSrc}
              onChange={(value) => updateVisual('imageSrc', value)}
            />
            <TextField
              label="视觉图替代文本"
              value={scene.visual.imageAlt}
              onChange={(value) => updateVisual('imageAlt', value)}
            />
            <NumberField
              label="视觉图宽度"
              min={30}
              max={95}
              value={scene.visual.imageWidth}
              onChange={(value) => updateVisual('imageWidth', value)}
            />
            <NumberField
              label="背景大字右侧"
              min={-20}
              max={20}
              value={scene.visual.ghostRight}
              onChange={(value) => updateVisual('ghostRight', value)}
            />
            <NumberField
              label="背景大字底部"
              min={-10}
              max={30}
              value={scene.visual.ghostBottom}
              onChange={(value) => updateVisual('ghostBottom', value)}
            />
          </EditorSection>

          <EditorSection title="引文">
            <TextField
              label="引文文本"
              value={scene.quote.text}
              multiline
              onChange={(value) => updateQuote('text', value)}
            />
            <TextField
              label="工作室标签"
              value={scene.quote.studioLabel}
              onChange={(value) => updateQuote('studioLabel', value)}
            />
            <TextField
              label="工作室内容"
              value={scene.quote.studioText}
              onChange={(value) => updateQuote('studioText', value)}
            />
            <TextField
              label="理念标签"
              value={scene.quote.philosophyLabel}
              onChange={(value) => updateQuote('philosophyLabel', value)}
            />
            <TextField
              label="理念内容"
              value={scene.quote.philosophyText}
              multiline
              onChange={(value) => updateQuote('philosophyText', value)}
            />
            <NumberField
              label="引文最大宽度"
              min={480}
              max={1100}
              value={scene.quote.maxWidth}
              onChange={(value) => updateQuote('maxWidth', value)}
            />
            <NumberField
              label="引文 X"
              min={-360}
              max={360}
              value={scene.quote.x ?? 0}
              onChange={(value) => updateQuote('x', value)}
            />
            <NumberField
              label="引文 Y"
              min={-320}
              max={320}
              value={scene.quote.y ?? 0}
              onChange={(value) => updateQuote('y', value)}
            />
            <NumberField
              label="引文背景透明度"
              min={0}
              max={100}
              value={scene.quote.backgroundOpacity ?? 20}
              onChange={(value) => updateQuote('backgroundOpacity', value)}
            />
            <NumberField
              label="引文背景模糊范围"
              min={0}
              max={120}
              value={scene.quote.backgroundBlur ?? 44}
              onChange={(value) => updateQuote('backgroundBlur', value)}
            />
            <NumberField
              label="引文背景扩散"
              min={0}
              max={80}
              value={scene.quote.backgroundPadding ?? 28}
              onChange={(value) => updateQuote('backgroundPadding', value)}
            />
          </EditorSection>

          <EditorSection title="页脚">
            <TextField
              label="页脚第一行"
              value={scene.footer.titleLine1}
              onChange={(value) => updateFooter('titleLine1', value)}
            />
            <TextField
              label="页脚第二行"
              value={scene.footer.titleLine2}
              onChange={(value) => updateFooter('titleLine2', value)}
            />
            <TextField
              label="页脚按钮"
              value={scene.footer.ctaLabel}
              onChange={(value) => updateFooter('ctaLabel', value)}
            />
            <TextField
              label="版权第一行"
              value={scene.footer.copyrightLine1}
              onChange={(value) => updateFooter('copyrightLine1', value)}
            />
            <TextField
              label="版权第二行"
              value={scene.footer.copyrightLine2}
              onChange={(value) => updateFooter('copyrightLine2', value)}
            />
          </EditorSection>
        </aside>
      ) : null}
    </>
  )
}

export default SunyataEditor
