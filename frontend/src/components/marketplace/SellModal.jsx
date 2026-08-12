import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, ImageOff } from 'lucide-react'
import Modal from '../ui/Modal'
import { Input, Field, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { CATEGORIES, CONDITIONS } from '../../lib/constants'
import { createProduct } from '../../api/products'
import { predictPrice } from '../../api/ai'
import { useToast } from '../ui/Toast'
import { fadeUp, feedbackPop, staggerContainer } from '../../lib/motion'

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
      {children}
    </p>
  )
}

export default function SellModal({ open, onClose, onSuccess }) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceSuggestion, setPriceSuggestion] = useState(null)
  const [imageError, setImageError] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'electronics',
    condition: 'good',
    imageUrl: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === 'imageUrl') {
      setImageError(false)
    }

    // The old AI suggestion is no longer valid if
    // the listing details change.
    if (['title', 'description', 'category', 'condition'].includes(name)) {
      setPriceSuggestion(null)
    }
  }

  const handleSuggestPrice = async () => {
    if (!formData.title.trim()) {
      toast('Enter a title before asking AI for a price.', {
        type: 'error',
      })
      return
    }

    if (!formData.description.trim()) {
      toast('Add a description before asking AI for a price.', {
        type: 'error',
      })
      return
    }

    if (!formData.category || !formData.condition) {
      toast('Select a category and condition first.', {
        type: 'error',
      })
      return
    }

    setPriceLoading(true)
    setPriceSuggestion(null)

    try {
      const result = await predictPrice({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
      })

      if (!result || result.error || result.fallback) {
        throw new Error('AI price prediction unavailable')
      }

      setPriceSuggestion(result)
    } catch (err) {
      console.error('AI price prediction failed:', err)

      toast('AI price prediction is currently unavailable.', {
        type: 'error',
      })
    } finally {
      setPriceLoading(false)
    }
  }

  const handleUseSuggestedPrice = () => {
    if (!priceSuggestion?.predicted_price) return

    setFormData((prev) => ({
      ...prev,
      price: String(priceSuggestion.predicted_price),
    }))

    toast('AI suggested price applied.', {
      type: 'success',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: formData.imageUrl ? [formData.imageUrl] : [],
      }

      await createProduct(payload)

      toast('Item listed successfully!', {
        type: 'success',
      })

      setFormData({
        title: '',
        description: '',
        price: '',
        category: 'electronics',
        condition: 'good',
        imageUrl: '',
      })

      setPriceSuggestion(null)

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'Failed to list item'

      toast(msg, {
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const hasPreview = formData.imageUrl.trim() && !imageError

  return (
    <Modal open={open} onClose={onClose} title="List an Item">
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="show"
      >
        {/* IDENTITY */}
        <motion.div variants={fadeUp} className="space-y-4">
          <SectionLabel>Item details</SectionLabel>

          <Field label="Title" htmlFor="title">
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. MacBook Air M1"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)" htmlFor="price">
              <Input
                id="price"
                name="price"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="Category" htmlFor="category">
              <Select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Condition" htmlFor="condition">
            <Select
              id="condition"
              name="condition"
              value={formData.condition}
              onChange={handleChange}
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </motion.div>

        {/* PHOTO */}
        <motion.div variants={fadeUp} className="space-y-3">
          <SectionLabel>Photo</SectionLabel>

          <div className="grid grid-cols-[1fr_auto] gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Image URL" htmlFor="imageUrl">
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={handleChange}
              />
            </Field>

            {/* Live preview — reflects the listing photo before submission */}
            <div className="flex h-[74px] w-full items-end overflow-hidden rounded-lg border border-dashed border-border bg-muted sm:h-auto">
              <AnimatePresence mode="wait" initial={false}>
                {hasPreview ? (
                  <motion.img
                    key={formData.imageUrl}
                    src={formData.imageUrl}
                    alt="Listing preview"
                    onError={() => setImageError(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground"
                  >
                    <ImageOff className="h-4 w-4" />
                    <span className="text-[10px]">Preview</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* AI PRICE PREDICTION */}
        <motion.div variants={fadeUp} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  AI Price Assistant
                </p>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Get an estimated fair market price based on your item&apos;s
                category, condition and description.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggestPrice}
              loading={priceLoading}
              className="shrink-0"
            >
              {priceLoading ? 'Analyzing...' : 'Suggest Price'}
            </Button>
          </div>

          <AnimatePresence>
            {priceSuggestion && (
              <motion.div
                variants={feedbackPop}
                initial="hidden"
                animate="show"
                exit="exit"
                className="mt-4 rounded-lg border border-border bg-muted/40 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fair price
                    </p>
                    <p className="mt-1 text-lg font-bold text-primary tabular-nums">
                      ₹{priceSuggestion.predicted_price?.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Expected range
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      ₹{priceSuggestion.price_range?.low?.toLocaleString()}
                      {' – '}
                      ₹{priceSuggestion.price_range?.high?.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Confidence
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      {Math.round(
                        (priceSuggestion.confidence || 0) * 100
                      )}
                      %
                    </p>
                  </div>
                </div>

                {priceSuggestion.market_insight && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    💡 {priceSuggestion.market_insight}
                  </p>
                )}

                {priceSuggestion.reasoning?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {priceSuggestion.reasoning.map((reason, index) => (
                      <p
                        key={index}
                        className="text-xs text-muted-foreground"
                      >
                        • {reason}
                      </p>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleUseSuggestedPrice}
                  className="mt-4"
                >
                  Use Suggested Price
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* DESCRIPTION */}
        <motion.div variants={fadeUp}>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Include details like age, usage, defects, or pick-up location..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </Field>
        </motion.div>

        {/* SUBMIT */}
        <motion.div variants={fadeUp} className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" loading={loading}>
            {loading ? 'Posting...' : 'List Item'}
          </Button>
        </motion.div>
      </motion.form>
    </Modal>
  )
}
