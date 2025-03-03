import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: false },
  mediaUrl: { type: String, required: false },
  platforms: [{
    name: { type: String, enum: ['youtube', 'facebook', 'instagram', 'tiktok'], required: true },
    posted: { type: Boolean, default: false },
    postId: { type: String, default: null },
    postUrl: { type: String, default: null }
  }],
  scheduledFor: { type: Date, default: null },
}, { timestamps: true });

// A post must have either content or media
postSchema.pre('save', function(next) {
  if (!this.content && !this.mediaUrl) {
    return next(new Error('Post must have either content or media'));
  }
  next();
});

export default mongoose.models.SocialPost || mongoose.model('SocialPost', postSchema);