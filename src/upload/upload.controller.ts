import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // POST /api/upload/image
  @Post('image')
  @ApiOperation({ summary: 'Upload 1 ảnh lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadImage(file, 'images');
    return {
      success: true,
      message: 'Upload ảnh thành công',
      data: result,
    };
  }

  // POST /api/upload/images
  @Post('images')
  @ApiOperation({ summary: 'Upload nhiều ảnh cùng lúc (tối đa 10)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    const results = await this.uploadService.uploadMultipleImages(files, 'images');
    return {
      success: true,
      message: `Upload ${results.length} ảnh thành công`,
      data: results,
    };
  }

  // DELETE /api/upload/:publicId
  @Delete(':publicId')
  @ApiOperation({ summary: 'Xóa ảnh khỏi Cloudinary theo publicId' })
  async deleteImage(@Param('publicId') publicId: string) {
    await this.uploadService.deleteImage(publicId);
    return {
      success: true,
      message: 'Xóa ảnh thành công',
    };
  }
}
