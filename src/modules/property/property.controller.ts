import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { uploadImage } from '../../lib/cloudinary';
import {
  getProperties, getPropertyById, createProperty, updateProperty,
  deleteProperty, removePropertyImage, getFeaturedProperties,
  getAgentProperties, getPropertyStats,
} from './property.service';
import { propertyFilterSchema } from './property.schema';

export const listProperties = asyncHandler(async (req: Request, res: Response) => {
  const filters = propertyFilterSchema.parse(req.query);
  const result = await getProperties(filters);
  res.json(new ApiResponse(200, result, 'Properties fetched'));
});

export const getProperty = asyncHandler(async (req: Request, res: Response) => {
  const property = await getPropertyById(req.params.id as string, true);
  res.json(new ApiResponse(200, property, 'Property fetched'));
});

export const createPropertyHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  const images: string[] = [];

  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadImage(f.buffer, 'properties')));
    images.push(...uploads.map((u) => u.url));
  }

  const property = await createProperty(req.user!.userId, req.body, images);
  res.status(201).json(new ApiResponse(201, property, 'Property created'));
});

export const updatePropertyHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  const newImages: string[] = [];

  if (files && files.length > 0) {
    const uploads = await Promise.all(files.map((f) => uploadImage(f.buffer, 'properties')));
    newImages.push(...uploads.map((u) => u.url));
  }

  const property = await updateProperty(req.params.id as string, req.user!.userId, req.user!.role, req.body, newImages);
  res.json(new ApiResponse(200, property, 'Property updated'));
});

export const deletePropertyHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  await deleteProperty(req.params.id as string, req.user!.userId, req.user!.role);
  res.json(new ApiResponse(200, null, 'Property deleted'));
});

export const removeImageHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { imageUrl } = req.body as { imageUrl: string };
  const property = await removePropertyImage(req.params.id as string, req.user!.userId, req.user!.role, imageUrl);
  res.json(new ApiResponse(200, property, 'Image removed'));
});

export const featuredPropertiesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const properties = await getFeaturedProperties();
  res.json(new ApiResponse(200, properties, 'Featured properties fetched'));
});

export const agentPropertiesHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getAgentProperties(req.user!.userId, parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'Agent properties fetched'));
});

export const propertyStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getPropertyStats();
  res.json(new ApiResponse(200, stats, 'Property stats fetched'));
});
