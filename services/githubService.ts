import { PinnedRepo } from '../types';

const GITHUB_API_URL = "https://api.github.com/graphql";

export const getPinnedRepos = async (username: string = "jakops88-hub"): Promise<PinnedRepo[]> => {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn("GITHUB_TOKEN is missing from environment variables.");
    return [];
  }

  const query = `
    query($username: String!) {
      user(login: $username) {
        pinnedItems(first: 10, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              stargazerCount
              primaryLanguage {
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GITHUB_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        variables: { username }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const json = await response.json();
    
    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      return [];
    }

    const nodes = json.data?.user?.pinnedItems?.nodes || [];

    return nodes.map((node: any) => ({
      name: node.name,
      description: node.description,
      url: node.url,
      stargazerCount: node.stargazerCount,
      language: node.primaryLanguage?.name || "N/A"
    }));

  } catch (error) {
    console.error("Failed to fetch pinned repos:", error);
    return [];
  }
};