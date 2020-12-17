import { Dimension } from './dimension'
import { Schema } from './schema'

import { EptToolsError } from 'types'
import { Bytes, Scale } from 'utils'

export declare namespace View {
  export type Getter = (index: number) => number
  export type Getters = { [name: string]: Getter | undefined }

  export type Setter = (value: number, index: number) => void
  export type Setters = { [name: string]: Setter | undefined }

  export type Base = { schema: Schema; length: number }
  export type Readable = Base & { getter: (name: string) => Getter }
  export type Writable = Base & { setter: (name: string) => Setter }
}

export const View = {
  Readable: { create: createReadable },
}

function getLength(buffer: Buffer, schema: Schema): number {
  const pointSize = Schema.pointSize(schema)

  if (pointSize === 0) {
    throw new EptToolsError(`Invalid schema point size: ${pointSize}`)
  }

  const length = buffer.length / pointSize
  if (buffer.length % pointSize !== 0) {
    throw new EptToolsError('Invalid buffer length for this schema')
  }

  return length
}

function createReadable(buffer: Buffer, schema: Schema): View.Readable {
  const length = getLength(buffer, schema)

  const pointSize = Schema.pointSize(schema)

  const map = schema.reduce<View.Getters>((map, dim) => {
    const { scale = 1, offset = 0 } = dim
    const ctype = Dimension.ctype(dim)
    const extractor = Bytes.Getter.create(buffer, ctype)
    const dimOffset = Schema.offset(schema, dim.name)

    map[dim.name] = (index: number) => {
      if (index >= length) {
        throw new EptToolsError(`Invalid point index: ${index} >= ${length}`)
      }
      return Scale.unapply(
        extractor(index * pointSize + dimOffset),
        scale,
        offset
      )
    }
    return map
  }, {})

  const getter = (name: string) => {
    const get = map[name]
    if (!get) throw new EptToolsError(`Invalid dimension: ${name}`)
    return get
  }

  return { schema, length, getter }
}

/*
function createWritable(buffer: Buffer, schema: Schema): View.Writable {

}
*/