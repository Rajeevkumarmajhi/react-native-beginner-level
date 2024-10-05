import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

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
    // Check if there is an active session
    const session = await account.get(); // This fetches the current active session if any
    return session; // Return the existing session
  } catch (error: any) {
    if (error.code === 401) {
      // If no session exists or the session has expired, create a new one
      try {
        const newSession = await account.createEmailPasswordSession(email, password);
        return newSession;
      } catch (createError: any) {
        throw new Error(createError.message);
      }
    } else {
      throw new Error(error.message);
    }
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
    const session = await account.deleteSession("current");
    return session;
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
    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, "image"),
      uploadFile(form.video, "video"),
    ]);

    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    return newPost;
  } catch (error) {
    throw new Error(error);
  }
}


// Get all video Posts
export async function getAllPosts(): Promise<any[]> {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId
    );
    return posts.documents;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Get video posts created by user
export async function getUserPosts(userId: string): Promise<any[]> {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.equal("creator", userId)]
    );

    return posts.documents;
  } catch (error: any) {
    return [];
  }
}

// Get video posts that match search query
export async function searchPosts(query: string): Promise<any[]> {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.search("title", query)]
    );

    if (!posts) throw new Error("No matching posts found");

    return posts.documents;
  } catch (error: any) {
    throw new Error(error.message);
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
