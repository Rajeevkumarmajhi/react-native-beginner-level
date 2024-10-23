import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

import AsyncStorage from '@react-native-async-storage/async-storage';

export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.rktech.aura",
  projectId: "66fab39c00289cd9349a",
  storageId: "66faba0a00116d966d5d",
  databaseId: "66fab61d001f81ceb158",
  userCollectionId: "66fab65e0038f3c0e5ed",
  videoCollectionId: "66fab694000f856aaabc",
};
interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const databases = new Databases(client);

interface UserForm {
  email: string;
  password: string;
  username: string;
}

interface VideoPostForm {
  title: string;
  thumbnail: File;
  video: File;
  prompt: string;
  userId: string;
}

// Register user
export async function createUser(
  email: string,
  password: string,
  username: string
): Promise<any> {
  try {
    const newAccount = await account.create(ID.unique(), email, password, username);

    if (!newAccount) throw new Error("Failed to create account");

    const avatarUrl = avatars.getInitials(username);

    // Sign in the user after account creation
    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email,
        username,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Sign In
export async function signIn(email: string, password: string): Promise<any> {
    try {
      const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.status == true) {
        // Save the token securely
        await AsyncStorage.setItem('userToken', data.token);
        return data.user;

      } else {
        return false;
      }

    } catch (createError: any) {
      throw new Error(createError.message);
    }
}


// Get Account
export async function getAccount(): Promise<any> {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Get Current User
export async function getCurrentUser(): Promise<any> {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) throw new Error("No current account");

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser) throw new Error("Failed to fetch user");

    return currentUser.documents[0];
  } catch (error: any) {
    console.log(error);
    return null;
  }
}

// Sign Out
export async function signOut(): Promise<any> {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      // Make a request to the logout API
      const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/logout', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`, // Pass the token in the headers
          },
      });

      const data = await response.json();

      if (data.status) {
          // Logout successful, now clear the token from AsyncStorage
          await AsyncStorage.removeItem('userToken');
          console.log('User logged out successfully');
      } else {
          console.log('Logout failed:', data.message);
      }
    }

  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Upload File
export async function uploadFile(file: ReactNativeFile, type: string): Promise<string | undefined> {
  if (!file) return;

  try {
    // Upload the file using its URI
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      {
        name: file.name, // Name of the file
        type: file.type, // MIME type of the file
        size: file.size, // Size of the file
        uri: file.uri   // URI pointing to the file on the device
      }
    );

    const fileUrl = await getFilePreview(uploadedFile.$id, type);
    return fileUrl;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Get File Preview
export async function getFilePreview(fileId: string, type: string): Promise<string> {
  try {
    let fileUrl;
    if (type === "video") {
      fileUrl = storage.getFileView(appwriteConfig.storageId, fileId);
    } else if (type === "image") {
      fileUrl = storage.getFilePreview(appwriteConfig.storageId, fileId, 2000, 2000, "top", 100);
    } else {
      throw new Error("Invalid file type");
    }

    if (!fileUrl) throw new Error("Failed to retrieve file URL");

    return fileUrl;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Create Video Post
export async function createVideoPost(form) {
  try {
    const token = await AsyncStorage.getItem('userToken');

    let formData = new FormData();
    formData.append('title', form.title);
    formData.append('prompt', form.prompt || '');

    // Append thumbnail and video as files
    formData.append('thumbnail', {
      uri: form.thumbnail.uri, // Make sure form.thumbnail contains an object with 'uri'
      type: form.thumbnail.type || 'image/jpeg', // Add correct MIME type (e.g., 'image/jpeg')
      name: form.thumbnail.name || 'thumbnail.jpg', // Add file name
    });

    formData.append('video', {
      uri: form.video.uri, // Make sure form.video contains an object with 'uri'
      type: form.video.type || 'video/mp4', // Add correct MIME type (e.g., 'video/mp4')
      name: form.video.name || 'video.mp4', // Add file name
    });

    const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/video-posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Pass the token in the headers
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const jsonResponse = await response.json();

    if (response.ok) {
      return jsonResponse;
    } else {
      throw new Error(jsonResponse.message || 'Something went wrong');
    }
  } catch (error) {
    throw new Error(error.message);
  }
}
// export async function createVideoPost(form) {
//   try {
//     const token = await AsyncStorage.getItem('userToken');

//     const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/video-posts', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`, // Pass the token in the headers
//         },
//     });






//     // const [thumbnailUrl, videoUrl] = await Promise.all([
//     //   uploadFile(form.thumbnail, "image"),
//     //   uploadFile(form.video, "video"),
//     // ]);



//     // const newPost = await databases.createDocument(
//     //   appwriteConfig.databaseId,
//     //   appwriteConfig.videoCollectionId,
//     //   ID.unique(),
//     //   {
//     //     title: form.title,
//     //     thumbnail: thumbnailUrl,
//     //     video: videoUrl,
//     //     prompt: form.prompt,
//     //     creator: form.userId,
//     //   }
//     // );

//     return newPost;
//   } catch (error) {
//     throw new Error(error);
//   }
// }


// Get all video Posts
export async function getAllPosts() {
  try {
    const token = await AsyncStorage.getItem('userToken');

    const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/video-posts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Pass the token in the headers
        'Content-Type': 'application/json',
      },
    });

    const jsonResponse = await response.json();

    if (response.ok) {
      return jsonResponse.data; // Assuming 'data' holds the list of posts
    } else {
      throw new Error(jsonResponse.message || 'Something went wrong');
    }
  } catch (error) {
    throw new Error(error.message);
  }
}


// Get video posts created by user
export async function getUserPosts(): Promise<any[]> {
  try {
    const token = await AsyncStorage.getItem('userToken');

    const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/video-posts?self_data=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Pass the token in the headers
      },
    });

    const data = await response.json();
    if (data.status) {
      return data.data; // Return the list of posts
    } else {
      return [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}


// Get video posts that match search query
// export async function searchPosts(query: string): Promise<any[]> {
//   try {
//     const posts = await databases.listDocuments(
//       appwriteConfig.databaseId,
//       appwriteConfig.videoCollectionId,
//       [Query.search("title", query)]
//     );

//     if (!posts) throw new Error("No matching posts found");

//     return posts.documents;
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// }

export async function searchPosts(query : string ): Promise<any[]> {
  try {
    const token = await AsyncStorage.getItem('userToken');

    const response = await fetch('https://petvet.rajeevkumarmajhi.com.np/api/video-posts?search='+query, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Pass the token in the headers
      },
    });

    const data = await response.json();
    if (data.status) {
      return data.data; // Return the list of posts
    } else {
      return [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}


// Get latest created video posts
export async function getLatestPosts(): Promise<any[]> {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(7)]
    );

    return posts.documents;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
