import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { Input, Field, Select, Textarea } from '../ui/Input'
import { CATEGORIES, CONDITIONS } from '../../lib/constants'
import { createProduct } from '../../api/products'
import { predictPrice } from '../../api/ai'
import { useToast } from '../ui/Toast'

export default function SellModal({ open, onClose, onSuccess }) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceSuggestion, setPriceSuggestion] = useState(null)

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

  return (
    <Modal open={open} onClose={onClose} title="List an Item">
      <form onSubmit={handleSubmit} className="space-y-5">
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

        {/* AI PRICE PREDICTION */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  AI Price Assistant
                </p>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Get an estimated fair market price based on your item's
                category, condition and description.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSuggestPrice}
              disabled={priceLoading}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {priceLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Suggest Price'
              )}
            </button>
          </div>

          {priceSuggestion && (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Fair price
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    ₹{priceSuggestion.predicted_price?.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Expected range
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    ₹{priceSuggestion.price_range?.low?.toLocaleString()}
                    {' – '}
                    ₹{priceSuggestion.price_range?.high?.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Confidence
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
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

              <button
                type="button"
                onClick={handleUseSuggestedPrice}
                className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Use Suggested Price
              </button>
            </div>
          )}
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

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'List Item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}