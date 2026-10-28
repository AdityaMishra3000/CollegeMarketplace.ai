import { useState, useRef } from 'react'
import { Sparkles, Check, Camera, Image, X, Upload, Link as LinkIcon, Video, RefreshCw } from 'lucide-react'
import Modal from '../ui/Modal'
import { Input, Field, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Eyebrow, Price } from '../ui/Editorial'
import { CATEGORIES, CONDITIONS } from '../../lib/constants'
import { createProduct, uploadVerificationVideo } from '../../api/products'
import { predictPrice } from '../../api/ai'
import { useToast } from '../ui/Toast'
import { pickPhoto, isNative, hapticTap } from '../../lib/native'

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
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [formData, setFormData] = useState(EMPTY)
  const [showUrlInput, setShowUrlInput] = useState(false)

  // Mobile-only video verification state
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null)
  const [videoDuration, setVideoDuration] = useState(null)
  const [videoSizeMb, setVideoSizeMb] = useState(null)

  const update = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // A suggestion is only valid for the inputs it was made from.
    if (['title', 'description', 'category', 'condition'].includes(name)) setSuggestion(null)
  }

  const handleVideoSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 1. Max size: 30 MB
    const maxBytes = 30 * 1024 * 1024
    if (file.size > maxBytes) {
      toast('Video exceeds 30 MB limit. Please record a shorter clip.', { type: 'error' })
      if (videoInputRef.current) videoInputRef.current.value = ''
      return
    }

    if (!file.type.startsWith('video/')) {
      toast('Please select a valid video recording.', { type: 'error' })
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const tempVideo = document.createElement('video')
    tempVideo.preload = 'metadata'
    tempVideo.src = objectUrl

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration
      if (duration > 30.5) {
        toast(`Video is ${Math.round(duration)}s long. Maximum allowed duration is 30s.`, {
          type: 'error',
        })
        URL.revokeObjectURL(objectUrl)
        if (videoInputRef.current) videoInputRef.current.value = ''
        return
      }
      if (duration < 3.0) {
        toast(`Video is too short (${duration.toFixed(1)}s). Minimum 3s required.`, {
          type: 'error',
        })
        URL.revokeObjectURL(objectUrl)
        if (videoInputRef.current) videoInputRef.current.value = ''
        return
      }

      setVideoFile(file)
      setVideoPreviewUrl(objectUrl)
      setVideoDuration(duration)
      setVideoSizeMb((file.size / (1024 * 1024)).toFixed(1))
      toast('Verification video recorded', { type: 'success' })
    }

    tempVideo.onerror = () => {
      setVideoFile(file)
      setVideoPreviewUrl(objectUrl)
      setVideoDuration(10)
      setVideoSizeMb((file.size / (1024 * 1024)).toFixed(1))
    }
  }

  const handleClearVideo = () => {
    hapticTap()
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setVideoDuration(null)
    setVideoSizeMb(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleCameraCapture = async () => {
    hapticTap()
    try {
      const photo = await pickPhoto('camera')
      if (photo?.dataUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: photo.dataUrl }))
        toast('Photo captured successfully', { type: 'success' })
      }
    } catch {
      toast('Could not access camera', { type: 'error' })
    }
  }

  const handleGalleryPick = async () => {
    hapticTap()
    try {
      const photo = await pickPhoto('photos')
      if (photo?.dataUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: photo.dataUrl }))
        toast('Photo selected', { type: 'success' })
      }
    } catch {
      toast('Could not access photos', { type: 'error' })
    }
  }

  const handleFileInput = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', { type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: dataUrl }))
        toast('Photo attached', { type: 'success' })
      }
    }
    reader.onerror = () => {
      toast('Could not read image file', { type: 'error' })
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    hapticTap()
    setFormData((prev) => ({ ...prev, imageUrl: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      const created = await createProduct({
        title: formData.title,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: formData.imageUrl ? [formData.imageUrl] : [],
      })

      if (isNative && videoFile && created?._id) {
        try {
          toast('Processing video verification...', { type: 'info' })
          const res = await uploadVerificationVideo(created._id, videoFile, videoDuration)
          const status = res?.verification?.status
          if (status === 'verified') {
            toast('Listing created and video verified!', { type: 'success', title: 'Verified' })
          } else if (status === 'review_required') {
            toast('Listing created; video submitted for review.', {
              type: 'info',
              title: 'Under Review',
            })
          } else {
            toast('Listing created with video.', { type: 'success' })
          }
        } catch (uploadErr) {
          toast(
            uploadErr?.response?.data?.message || 'Listing created, but video upload failed.',
            { type: 'error' }
          )
        }
      } else {
        toast('Your item is live on the marketplace.', { type: 'success', title: 'Listed' })
      }

      setFormData(EMPTY)
      handleClearVideo()
      setSuggestion(null)
      setShowUrlInput(false)
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

          {/* Photo upload / camera section */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Item Photo
            </label>

            {formData.imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card p-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={formData.imageUrl}
                    alt="Listing preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-xs text-muted-foreground">Photo attached</span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput((v) => !v)}
                    className="text-xs text-primary-ink underline hover:opacity-80"
                  >
                    {showUrlInput ? 'Hide URL' : 'Edit URL'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {isNative ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCameraCapture}
                        className="flex-1"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGalleryPick}
                        className="flex-1"
                      >
                        <Image className="h-4 w-4" />
                        Gallery
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUrlInput((v) => !v)}
                  >
                    <LinkIcon className="h-4 w-4" />
                    URL
                  </Button>
                </div>
              </div>
            )}

            {showUrlInput && (
              <div className="mt-2">
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  placeholder="https://… (paste direct image URL)"
                  value={formData.imageUrl}
                  onChange={update}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile-Only Video Verification ─────────────────────────── */}
        {isNative && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow accent className="flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                Product Video Verification
              </Eyebrow>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Mobile Only
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Record a quick 5–30s camera video showing your item and condition to earn a Verified badge.
            </p>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/*"
              capture="environment"
              className="hidden"
              onChange={handleVideoSelect}
            />

            {videoPreviewUrl ? (
              <div className="mt-4 space-y-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                  <video
                    src={videoPreviewUrl}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {videoDuration ? `${videoDuration.toFixed(1)}s` : 'Recorded'}
                    </span>
                    <span>•</span>
                    <span>{videoSizeMb} MB</span>
                    <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retake
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearVideo}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3 w-3" />
                      Discard
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    hapticTap()
                    videoInputRef.current?.click()
                  }}
                  className="w-full gap-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5"
                >
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Record Verification Video (Max 30s)</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
