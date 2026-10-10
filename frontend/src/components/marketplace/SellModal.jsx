import { useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import Modal from '../ui/Modal'
import { Input, Field, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Eyebrow, Price } from '../ui/Editorial'
import { CATEGORIES, CONDITIONS } from '../../lib/constants'
import { createProduct } from '../../api/products'
import { predictPrice } from '../../api/ai'
import { useToast } from '../ui/Toast'

const EMPTY = {
  title: '',
  description: '',
  price: '',
  category: 'electronics',
  condition: 'good',
  imageUrl: '',
}

export default function SellModal({ open, onClose, onSuccess }) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [formData, setFormData] = useState(EMPTY)

  const update = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // A suggestion is only valid for the inputs it was made from.
    if (['title', 'description', 'category', 'condition'].includes(name)) setSuggestion(null)
  }

  const suggest = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast('Add a title and description first — the estimate reads both.', { type: 'error' })
      return
    }

    setPriceLoading(true)
    setSuggestion(null)
    try {
      const result = await predictPrice({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
      })
      if (!result || result.error) throw new Error('unavailable')
      setSuggestion(result)
    } catch (err) {
      toast(err?.response?.data?.message || 'The price assistant is unavailable right now.', {
        type: 'error',
      })
    } finally {
      setPriceLoading(false)
    }
  }

  const applySuggestion = () => {
    if (!suggestion?.predicted_price) return
    setFormData((prev) => ({ ...prev, price: String(suggestion.predicted_price) }))
    toast('Suggested price applied.', { type: 'success' })
  }

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await createProduct({
        title: formData.title,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: formData.imageUrl ? [formData.imageUrl] : [],
      })
      toast('Your item is live on the marketplace.', { type: 'success', title: 'Listed' })
      setFormData(EMPTY)
      setSuggestion(null)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast(err?.response?.data?.message || 'Could not create the listing.', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="New listing"
      title="Sell something"
      description="Two honest lines and a fair price sell faster than a long description."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="sell-form" loading={loading}>
            {loading ? 'Posting' : 'List item'}
          </Button>
        </>
      }
    >
      <form id="sell-form" onSubmit={submit} className="space-y-5">
        <Field label="What are you selling?" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            placeholder="e.g. MacBook Air M1, 2020"
            value={formData.title}
            onChange={update}
            required
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" required>
            <Select id="category" name="category" value={formData.category} onChange={update}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Condition" htmlFor="condition" required>
            <Select id="condition" name="condition" value={formData.condition} onChange={update}>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="description"
          hint="Age, usage, any defects, where you can meet."
          required
        >
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Used for one semester. Small scratch on the lid, everything else perfect. Can meet near the IT block."
            value={formData.description}
            onChange={update}
            required
          />
        </Field>

        {/* ── Price assistant ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Eyebrow accent className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Price assistant
              </Eyebrow>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Reads your title, category and condition and suggests a fair range for this campus.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={suggest} loading={priceLoading}>
              {priceLoading ? 'Reading' : 'Suggest a price'}
            </Button>
          </div>

          {suggestion && (
            <div className="mt-5 border-t border-border pt-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <Eyebrow>Fair price</Eyebrow>
                  <div className="mt-2">
                    <Price value={suggestion.predicted_price} size="lg" />
                  </div>
                </div>
                <dl className="flex gap-6 text-xs">
                  <div>
                    <dt className="eyebrow text-muted-foreground">Range</dt>
                    <dd className="mt-1.5 font-medium tabular-nums text-foreground">
                      ₹{suggestion.price_range?.low?.toLocaleString('en-IN')} – ₹
                      {suggestion.price_range?.high?.toLocaleString('en-IN')}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-muted-foreground">Confidence</dt>
                    <dd className="mt-1.5 font-medium tabular-nums text-foreground">
                      {Math.round((suggestion.confidence || 0) * 100)}%
                    </dd>
                  </div>
                </dl>
              </div>

              {suggestion.market_insight && (
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {suggestion.market_insight}
                </p>
              )}

              <Button type="button" size="sm" className="mt-4" onClick={applySuggestion}>
                <Check />
                Use this price
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your price (₹)" htmlFor="price" required>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="0"
              className="tabular-nums"
              value={formData.price}
              onChange={update}
              required
            />
          </Field>
          <Field label="Image URL" htmlFor="imageUrl" hint="Optional — paste a link to a photo.">
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://…"
              value={formData.imageUrl}
              onChange={update}
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
