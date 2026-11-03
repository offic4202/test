"use client"

import Hls from "hls.js"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import type { PublicStream } from "@/lib/types"

export function Player({ channelId, streams }: { channelId: string; streams: PublicStream[] }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<"tuning" | "playing" | "quiet" | "gesture">("tuning")
  const [note, setNote] = useState("Asking the first link.")
  const reported = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    const stream = streams[index]
    if (!video || !stream) return
    setStatus("tuning")
    setNote(`Link ${index + 1} of ${streams.length}${stream.quality ? ` · ${stream.quality}` : ""}`)
    const src = `/api/tune/${encodeURIComponent(channelId)}?n=${stream.index}`
    let hls: Hls | null = null
    let cancelled = false

    const markPlaying = () => {
      if (cancelled) return
      setStatus("playing")
      if (!reported.current) {
        reported.current = true
        const viewerId = rememberViewer()
        void fetch("/api/audience", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelId, viewerId }),
        })
      }
    }

    const fail = (message: string) => {
      if (cancelled) return
      if (index < streams.length - 1) {
        setNote(message)
        setIndex((current) => current + 1)
        return
      }
      setStatus("quiet")
      setNote("Every link on this channel stayed quiet or blocked.")
    }

    const slow = window.setTimeout(() => {
      if (video.readyState < 2) fail("That link was too slow. Trying the next one.")
    }, 12000)

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false,
        manifestLoadingTimeOut: 12000,
        levelLoadingTimeOut: 12000,
        fragLoadingTimeOut: 15000,
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        window.clearTimeout(slow)
        video.play().then(markPlaying).catch(() => {
          setStatus("gesture")
          setNote("Press play to start this feed.")
        })
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        window.clearTimeout(slow)
        fail("That link did not answer. Trying the next one.")
      })
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
      const onReady = () => {
        video.play().then(markPlaying).catch(() => setStatus("gesture"))
      }
      const onError = () => fail("That link did not answer. Trying the next one.")
      video.addEventListener("loadedmetadata", onReady)
      video.addEventListener("error", onError)
      return () => {
        cancelled = true
        window.clearTimeout(slow)
        video.removeEventListener("loadedmetadata", onReady)
        video.removeEventListener("error", onError)
      }
    } else {
      setStatus("quiet")
      setNote("This browser cannot play the stream.")
    }

    return () => {
      cancelled = true
      window.clearTimeout(slow)
      hls?.destroy()
    }
  }, [channelId, index, streams])

  const current = streams[index]

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />
        {status !== "playing" ? (
          <div className="absolute inset-x-0 bottom-14 flex items-center justify-between gap-3 px-4">
            <p className="rounded-full bg-black/70 px-3 py-1 text-xs text-white">{note}</p>
            {status === "gesture" ? (
              <Button
                size="sm"
                onClick={() => {
                  videoRef.current
                    ?.play()
                    .then(() => setStatus("playing"))
                    .catch(() => setStatus("quiet"))
                }}
              >
                Play
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(current && current.index >= 6 ? [...streams.slice(0, 5), current] : streams.slice(0, 6)).map((stream) => (
          <Button
            key={stream.index}
            size="sm"
            variant={stream.index === current?.index ? "default" : "outline"}
            onClick={() => setIndex(stream.index)}
          >
            {stream.quality || "Auto"}
            {stream.labels.length ? ` · ${stream.labels.join(", ")}` : ""}
          </Button>
        ))}
        {streams.length > 6 ? (
          <span className="text-xs text-muted-foreground">
            {streams.length - 6} more links if these stay quiet
          </span>
        ) : null}
      </div>
    </div>
  )
}

function rememberViewer() {
  const key = "play-station-viewer"
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(key, created)
  return created
}
