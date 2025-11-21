import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPhotos, savePhotos } from "@/lib/storage"

export async function GET() {
    // Try Supabase first
    if (supabase) {
        const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false })
        if (!error && data) return NextResponse.json(data)
    }

    // Fallback to local JSON DB
    const photos = getPhotos()
    // Sort by created_at desc
    photos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json(photos)
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // Try Supabase
        if (supabase) {
            const { data, error } = await supabase.from('photos').insert([body]).select()
            if (!error && data) return NextResponse.json(data)
        }

        // Fallback to local JSON DB
        const photos = getPhotos()
        const newPhoto = {
            id: Date.now(),
            ...body,
            created_at: new Date().toISOString()
        }
        photos.unshift(newPhoto)
        savePhotos(photos)

        return NextResponse.json({ success: true, data: newPhoto })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json()

        // Try Supabase
        if (supabase) {
            const { error } = await supabase.from('photos').delete().eq('id', id)
            if (!error) return NextResponse.json({ success: true })
        }

        // Fallback to local JSON DB
        const photos = getPhotos()
        // Use loose equality just in case, though JSON preserves types better than in-memory sometimes
        const newPhotos = photos.filter((p: any) => p.id != id)

        if (newPhotos.length !== photos.length) {
            savePhotos(newPhotos)
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false, error: "Item not found" })
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
