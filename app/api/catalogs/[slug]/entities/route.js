import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "data/catalogs.json")

function load() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"))
}

function save(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

export async function POST(req, { params }) {
  const { slug } = params
  const body = await req.json()

  const data = load()
  const catalog = data.find(c => c.slug === slug)

  if (!catalog) {
    return NextResponse.json({ error: "Catalog not found" }, { status: 404 })
  }

  const { type, entity } = body

  if (!catalog[type]) catalog[type] = []

  catalog[type].push(entity)

  save(data)

  return NextResponse.json({ ok: true })
}

export async function PUT(req, { params }) {
  const { slug } = params
  const body = await req.json()

  const data = load()
  const catalog = data.find(c => c.slug === slug)

  const { type, entity } = body

  catalog[type] = catalog[type].map(e =>
    e.id === entity.id ? entity : e
  )

  save(data)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req, { params }) {
  const { slug } = params
  const body = await req.json()

  const data = load()
  const catalog = data.find(c => c.slug === slug)

  const { type, id } = body

  catalog[type] = catalog[type].filter(e => e.id !== id)

  save(data)

  return NextResponse.json({ ok: true })
}
