// 기존 analyzeVideo 함수 백업
const analyzeVideo = async (uri: string) => {
  // FileSystem을 사용한 base64 변환
  console.log(`📹 Reading video from: ${uri}`);
  
  let base64;
  try {
    // expo-file-system을 사용한 base64 변환
    base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`📦 Base64 size: ${base64.length} chars`);
    
    // Base64가 너무 크면 줄이기 (2MB 제한)
    if (base64.length > 2 * 1024 * 1024) {
      console.warn('⚠️ Video too large, truncating...');
      base64 = base64.substring(0, 2 * 1024 * 1024);
    }
  } catch (readError: any) {
    console.error('Failed to read video file:', readError);
    // 폴백: fetch 사용
    const response = await fetch(uri);
    const blob = await response.blob();
    
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        console.log(`📹 Video size: ${blob.size} bytes`);
        console.log(`📦 Base64 size (fallback): ${base64Data.length} chars`);
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  console.log(`🚀 Sending request to: ${API_ENDPOINTS.videoAnalysis}`);
  console.log(`🔑 Token: ${token ? 'Present' : 'Missing'}`);
  
  let apiResponse;
  try {
    apiResponse = await fetchWithTimeout(
      API_ENDPOINTS.videoAnalysis,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'guest' ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ video: base64 }),
      },
      30000
    );
  } catch (fetchError: any) {
    console.error('Fetch error:', fetchError);
    console.error('URL was:', API_ENDPOINTS.videoAnalysis);
    console.error('Base64 length:', base64.length);
    throw fetchError;
  }
};