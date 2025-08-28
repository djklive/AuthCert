import { supabase } from '../lib/supabase'

export interface UploadResult {
  success: boolean
  publicUrl?: string
  path?: string
  error?: string
}

export class FileUploadService {
  /**
   * Upload un fichier vers Supabase Storage
   */
  static async uploadFile(
    file: File, 
    bucket: string, 
    path: string
  ): Promise<UploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return { 
        success: true, 
        publicUrl, 
        path 
      }
    } catch (error) {
      console.error('Upload error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }
    }
  }

  /**
   * Supprimer un fichier de Supabase Storage
   */
  static async deleteFile(bucket: string, path: string): Promise<UploadResult> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }
    }
  }

  /**
   * Lister les fichiers d'un bucket
   */
  static async listFiles(bucket: string, folder?: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder || '')

      if (error) throw error
      return { success: true, files: data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }
    }
  }

  /**
   * Générer un nom de fichier unique
   */
  static generateUniqueFileName(originalName: string, prefix?: string): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    const baseName = originalName.split('.').slice(0, -1).join('.')
    
    return `${prefix || 'file'}_${timestamp}_${randomId}.${extension}`
  }
}
