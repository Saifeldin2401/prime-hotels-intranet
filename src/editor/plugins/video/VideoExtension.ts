import { Node, mergeAttributes } from '@tiptap/core'

export interface VideoOptions {
  allowFullscreen: boolean
  controls: boolean
  nocookie: boolean
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      /**
       * Insert a video tag
       */
      setVideo: (options: { src: string; width?: number | string; height?: number | string }) => ReturnType
    }
  }
}

export const VideoExtension = Node.create<VideoOptions>({
  name: 'video',

  addOptions() {
    return {
      allowFullscreen: true,
      controls: true,
      nocookie: false,
      HTMLAttributes: {
        class: 'editor-video',
      },
    }
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: 'auto',
      },
      controls: {
        default: true,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: this.options.controls ? 'true' : null,
        preload: 'metadata',
        style: `width: ${HTMLAttributes.width}; height: ${HTMLAttributes.height}; border-radius: 8px;`,
      }),
    ]
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
