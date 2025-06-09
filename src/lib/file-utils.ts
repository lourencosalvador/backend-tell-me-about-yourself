import fs from "fs"
import path from "path"

export class FileUtils { 
  /**
   * Remove arquivo de forma segura, sem lançar erro se o arquivo não existir
   */
  static safeRemoveFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Arquivo removido: ${path.basename(filePath)}`)
        return true
      }
      return false
    } catch (error) {
      console.error(`❌ Erro ao remover arquivo ${filePath}:`, error)
      return false
    }
  }

  /**
   * Remove múltiplos arquivos de forma segura
   */
  static safeRemoveFiles(filePaths: string[]): number {
    let removedCount = 0
    for (const filePath of filePaths) {
      if (this.safeRemoveFile(filePath)) {
        removedCount++
      }
    }
    return removedCount
  }

  /**
   * Garante que um diretório existe, criando-o se necessário
   */
  static ensureDirectory(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        console.log(`📁 Diretório criado: ${dirPath}`)
      }
      return true
    } catch (error) {
      console.error(`❌ Erro ao criar diretório ${dirPath}:`, error)
      return false
    }
  }

  /**
   * Valida se um arquivo existe e não está vazio
   */
  static isValidFile(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        return false
      }
      const stats = fs.statSync(filePath)
      return stats.isFile() && stats.size > 0
    } catch (error) {
      return false
    }
  }
} 