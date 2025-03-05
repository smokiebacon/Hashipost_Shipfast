private async uploadedVideoSuccess(
id: string,
publishId: string,
accessToken: string
): Promise<{ url: string; id: number }> {
// eslint-disable-next-line no-constant-condition
while (true) {
const post = await (
await this.fetch(
'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
{
method: 'POST',
headers: {
'Content-Type': 'application/json; charset=UTF-8',
Authorization: `Bearer ${accessToken}`,
},
body: JSON.stringify({
publish_id: publishId,
}),
}
)
).json();

      const { status, publicaly_available_post_id } = post.data;

      if (status === 'PUBLISH_COMPLETE') {
        return {
          url: !publicaly_available_post_id
            ? `https://www.tiktok.com/@${id}`
            : `https://www.tiktok.com/@${id}/video/` +
              publicaly_available_post_id,
          id: !publicaly_available_post_id
            ? publishId
            : publicaly_available_post_id?.[0],
        };
      }

      if (status === 'FAILED') {
        throw new BadBody('titok-error-upload', JSON.stringify(post), {
          // @ts-ignore
          postDetails,
        });
      }

      await timer(3000);
    }

}

private postingMethod(method: TikTokDto["content_posting_method"]): string {
switch (method) {
case 'UPLOAD':
return '/inbox/video/init/';
case 'DIRECT_POST':
default:
return '/video/init/';
}
}

async post(
id: string,
accessToken: string,
postDetails: PostDetails<TikTokDto>[],
integration: Integration
): Promise<PostResponse[]> {
const [firstPost, ...comments] = postDetails;
const {
data: { publish_id },
} = await (
await this.fetch(
`https://open.tiktokapis.com/v2/post/publish${this.postingMethod(firstPost.settings.content_posting_method)}`,
{
method: 'POST',
headers: {
'Content-Type': 'application/json; charset=UTF-8',
Authorization: `Bearer ${accessToken}`,
},
body: JSON.stringify({
...(firstPost.settings.content_posting_method === 'DIRECT_POST' ? {
post_info: {
title: firstPost.message,
privacy_level: firstPost.settings.privacy_level,
disable_duet: !firstPost.settings.duet,
disable_comment: !firstPost.settings.comment,
disable_stitch: !firstPost.settings.stitch,
brand_content_toggle: firstPost.settings.brand_content_toggle,
brand_organic_toggle: firstPost.settings.brand_organic_toggle,
}
} : {}),
source_info: {
source: 'PULL_FROM_URL',
video_url: firstPost?.media?.[0]?.url!,
},
}),
}
)
).json();

    const { url, id: videoId } = await this.uploadedVideoSuccess(
      integration.profile!,
      publish_id,
      accessToken
    );

    return [
      {
        id: firstPost.id,
        releaseURL: url,
        postId: String(videoId),
        status: 'success',
      },
    ];

}
}
